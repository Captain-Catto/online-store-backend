import { Request, Response } from "express";
import { Op, QueryTypes } from "sequelize";
import sequelize from "../config/db";
import Order from "../models/Order";
import OrderDetail from "../models/OrderDetail";
import ProductInventory from "../models/ProductInventory";
import ProductDetail from "../models/ProductDetail";
import PaymentStatus from "../models/PaymentStatus";
import Product from "../models/Product";
import Users from "../models/Users";
import { sendOrderStatusUpdateEmail } from "../services/orderEmailService";

/**
 * Cập nhật trạng thái đơn hàng (chỉ dành cho admin)
 *
 * Quy trình:
 * 1. Tạo transaction để đảm bảo tính toàn vẹn dữ liệu
 * 2. Tìm đơn hàng theo ID
 * 3. Kiểm tra điều kiện:
 *    - Đơn hàng phải tồn tại
 *    - Không thể thay đổi trạng thái của đơn hàng đã hủy
 * 4. Cập nhật trạng thái mới và trạng thái thanh toán
 * 5. Lưu thay đổi và commit transaction
 *
 * @param req - Request chứa ID đơn hàng và trạng thái mới
 * @param res - Response trả về kết quả cập nhật
 */
export const updateOrderStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  // Khởi tạo transaction để đảm bảo tính nhất quán của dữ liệu
  const t = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { status, paymentStatusId } = req.body;

    // Tìm đơn hàng theo ID trong database
    const order = await Order.findByPk(id, { transaction: t });

    // Kiểm tra nếu đơn hàng không tồn tại
    if (!order) {
      await t.rollback();
      res.status(404).json({ message: "Đơn hàng không tồn tại" });
      return;
    }

    // Kiểm tra điều kiện: không cho phép thay đổi trạng thái của đơn hàng đã hủy
    if (
      order.getDataValue("status") === "cancelled" &&
      status !== "cancelled"
    ) {
      await t.rollback();
      res
        .status(400)
        .json({ message: "Không thể thay đổi trạng thái đơn hàng đã hủy" });
      return;
    }

    // Tiến hành cập nhật trạng thái mới cho đơn hàng
    await order.update(
      {
        status: status || order.getDataValue("status"),
        paymentStatusId:
          paymentStatusId || order.getDataValue("paymentStatusId"),
      },
      { transaction: t }
    );

    // Commit transaction nếu mọi thứ thành công
    await t.commit();

    // Gửi email thông báo cập nhật trạng thái (bất đồng bộ)
    if (status && order.getDataValue("userId")) {
      setImmediate(() => {
        sendOrderStatusUpdateEmail(Number(id), status);
      });
    }

    // Trả về kết quả thành công
    res.status(200).json({
      message: "Cập nhật trạng thái đơn hàng thành công",
      order,
    });
  } catch (error: any) {
    // Rollback transaction nếu có lỗi
    await t.rollback();
    res.status(500).json({ message: error.message });
  }
};

/**
 * Hủy đơn hàng (chỉ dành cho admin)
 *
 * Quy trình:
 * 1. Tạo transaction để đảm bảo tính toàn vẹn của dữ liệu
 * 2. Tìm đơn hàng và chi tiết đơn hàng theo ID
 * 3. Kiểm tra điều kiện:
 *    - Đơn hàng phải tồn tại
 *    - Không thể hủy đơn hàng đã hủy trước đó
 *    - Không thể hủy đơn hàng đã giao
 * 4. Cập nhật trạng thái đơn hàng thành "cancelled"
 * 5. Hoàn trả số lượng tồn kho cho các sản phẩm
 * 6. Cập nhật trạng thái các sản phẩm
 *
 * @param req - Request chứa ID đơn hàng và ghi chú hủy đơn
 * @param res - Response trả về kết quả hủy đơn
 */
export const cancelOrder = async (
  req: Request,
  res: Response
): Promise<void> => {
  // Khởi tạo transaction để đảm bảo tính nhất quán của dữ liệu
  const t = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { cancelNote } = req.body;

    // Tìm đơn hàng và bao gồm chi tiết đơn hàng
    const order = await Order.findByPk(id, {
      transaction: t,
      include: [
        {
          model: OrderDetail,
          as: "orderDetails",
        },
      ],
    });

    // Kiểm tra nếu đơn hàng không tồn tại
    if (!order) {
      await t.rollback();
      res.status(404).json({ message: "Đơn hàng không tồn tại" });
      return;
    }

    // Kiểm tra nếu đơn hàng đã ở trạng thái "cancelled"
    if (order.getDataValue("status") === "cancelled") {
      await t.rollback();
      res.status(400).json({ message: "Đơn hàng đã được hủy trước đó" });
      return;
    }

    // Kiểm tra nếu đơn hàng đã ở trạng thái "delivered"
    if (order.getDataValue("status") === "delivered") {
      await t.rollback();
      res.status(400).json({ message: "Không thể hủy đơn hàng đã giao" });
      return;
    } // Lấy thông tin trạng thái thanh toán hiện tại
    const currentPaymentStatusId = order.getDataValue("paymentStatusId");
    const orderTotal = order.getDataValue("total");

    // Nếu đơn hàng đã thanh toán (paymentStatusId = 2), chuyển sang trạng thái hoàn tiền (paymentStatusId = 4)
    let updateData: any = {
      status: "cancelled",
      cancelNote: cancelNote || "Hủy bởi Admin",
    };

    if (currentPaymentStatusId === 2) {
      // Nếu trạng thái là "Paid"
      updateData.paymentStatusId = 4; // Cập nhật thành "Refunded"
      updateData.refundAmount = orderTotal; // Hoàn lại toàn bộ số tiền đã thanh toán
      updateData.refundReason = "Hoàn tiền do hủy đơn hàng";
    }

    // Cập nhật trạng thái đơn hàng thành "cancelled" và cập nhật trạng thái hoàn tiền nếu cần
    await order.update(updateData, { transaction: t });

    // Danh sách sản phẩm cần kiểm tra sau khi cập nhật tồn kho
    const updatedProductIds = new Set<number>();
    const orderDetails = (order as any).orderDetails || [];

    // BƯỚC 1: Hoàn trả tồn kho
    for (const detail of orderDetails) {
      const productId = detail.productId;
      updatedProductIds.add(productId);

      // Tìm ProductDetail dựa trên productDetailId (ưu tiên) hoặc productId và color
      let productDetail;
      if (detail.productDetailId) {
        productDetail = await ProductDetail.findByPk(detail.productDetailId, {
          transaction: t,
        });
      } else {
        productDetail = await ProductDetail.findOne({
          where: { productId, color: detail.color },
          transaction: t,
        });
      }

      if (!productDetail) {
        continue;
      }

      const inventory = await ProductInventory.findOne({
        where: { productDetailId: productDetail.id, size: detail.size },
        transaction: t,
      });

      if (inventory) {
        const currentStock = inventory.getDataValue("stock");
        const newStock = currentStock + detail.quantity;
        await inventory.update({ stock: newStock }, { transaction: t });
      } else {
        await ProductInventory.create(
          {
            productDetailId: productDetail.id,
            size: detail.size,
            stock: detail.quantity,
          },
          { transaction: t }
        );
      }
    }

    // BƯỚC 2: Truy vấn và cập nhật trạng thái sản phẩm
    for (const productId of updatedProductIds) {
      try {
        // Truy vấn trạng thái sản phẩm
        const product = await Product.findByPk(productId, { transaction: t });
        if (!product) {
          continue;
        }

        // Tính tổng tồn kho bằng Sequelize
        const totalStock =
          (await ProductInventory.sum("stock", {
            where: {
              productDetailId: {
                [Op.in]: sequelize.literal(
                  `(SELECT id FROM product_details WHERE productId = ${productId})`
                ),
              },
            },
            transaction: t,
          })) || 0;

        // Cập nhật trạng thái sản phẩm
        if (totalStock > 0 && product.status !== "active") {
          await sequelize.query(
            `UPDATE products SET status = 'active', updatedAt = NOW() 
             WHERE id = :productId AND status = 'outofstock'`,
            {
              replacements: { productId },
              type: QueryTypes.UPDATE,
              transaction: t,
            }
          );
        } else if (totalStock === 0 && product.status !== "outofstock") {
          await product.update({ status: "outofstock" }, { transaction: t });
        }
      } catch (error) {
        // Giữ lại log lỗi cho mục đích debug
        console.error(
          `[ERROR] Lỗi khi cập nhật trạng thái sản phẩm ID ${productId}:`,
          error
        );
      }
    }

    // Commit transaction nếu mọi thứ thành công
    await t.commit();

    // Trả về kết quả thành công
    res.status(200).json({
      message: "Hủy đơn hàng thành công",
      orderId: order.id,
      status: "cancelled",
    });
  } catch (error: any) {
    // Rollback transaction nếu có lỗi
    await t.rollback();
    console.error("[ERROR] Lỗi khi hủy đơn hàng:", {
      message: error.message,
      stack: error.stack,
      orderId: req.params.id,
    });
    res.status(500).json({ message: error.message });
  }
};

/**
 * Cập nhật trạng thái thanh toán (chỉ dành cho admin)
 *
 * Quy trình:
 * 1. Tạo transaction
 * 2. Kiểm tra trạng thái thanh toán mới có hợp lệ không
 * 3. Kiểm tra đơn hàng tồn tại
 * 4. Cập nhật trạng thái thanh toán
 * 5. Nếu thanh toán thành công và đơn hàng đang ở trạng thái chờ,
 *    thì chuyển sang trạng thái đang xử lý
 *
 * @param req - Request chứa ID đơn hàng và trạng thái thanh toán mới
 * @param res - Response trả về kết quả cập nhật
 */
export const updatePaymentStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  const t = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { paymentStatusId } = req.body;

    if (!paymentStatusId) {
      await t.rollback();
      res
        .status(400)
        .json({ message: "Thiếu thông tin trạng thái thanh toán" });
      return;
    }

    // Kiểm tra payment status có tồn tại không
    const paymentStatus = await PaymentStatus.findByPk(paymentStatusId, {
      transaction: t,
    });
    if (!paymentStatus) {
      await t.rollback();
      res.status(404).json({ message: "Trạng thái thanh toán không tồn tại" });
      return;
    }

    const order = await Order.findByPk(id, { transaction: t });
    if (!order) {
      await t.rollback();
      res.status(404).json({ message: "Đơn hàng không tồn tại" });
      return;
    }

    await order.update({ paymentStatusId }, { transaction: t });

    // Nếu thanh toán thành công (status = 2) và đơn chưa đang xử lý, thì chuyển sang đang xử lý
    if (paymentStatusId === 2 && order.getDataValue("status") === "pending") {
      await order.update({ status: "processing" }, { transaction: t });
    }

    await t.commit();

    res.status(200).json({
      message: "Cập nhật trạng thái thanh toán thành công",
      order,
    });
  } catch (error: any) {
    await t.rollback();
    res.status(500).json({ message: error.message });
  }
};

/**
 * Cập nhật địa chỉ giao hàng (chỉ dành cho admin)
 *
 * Quy trình:
 * 1. Tạo transaction để đảm bảo tính toàn vẹn của dữ liệu
 * 2. Kiểm tra các thông tin cập nhật có hợp lệ không
 * 3. Tìm đơn hàng theo ID
 * 4. Kiểm tra điều kiện: không thể cập nhật đơn hàng đã giao hoặc đã hủy
 * 5. Cập nhật thông tin giao hàng mới
 * 6. Lưu thay đổi và commit transaction
 *
 * @param req - Request chứa ID đơn hàng và thông tin giao hàng mới
 * @param res - Response trả về kết quả cập nhật
 */
export const updateShippingAddress = async (
  req: Request,
  res: Response
): Promise<void> => {
  const t = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { shippingAddress, phoneNumber } = req.body;

    if (!shippingAddress && !phoneNumber) {
      await t.rollback();
      res.status(400).json({ message: "Không có thông tin cần cập nhật" });
      return;
    }

    const order = await Order.findByPk(id, { transaction: t });
    if (!order) {
      await t.rollback();
      res.status(404).json({ message: "Đơn hàng không tồn tại" });
      return;
    }

    // Chỉ cho phép cập nhật khi đơn hàng chưa giao hoặc chưa hủy
    if (
      order.getDataValue("status") === "delivered" ||
      order.getDataValue("status") === "cancelled"
    ) {
      await t.rollback();
      res
        .status(400)
        .json({ message: "Không thể cập nhật đơn hàng đã giao hoặc đã hủy" });
      return;
    }

    // Cập nhật thông tin
    const updateData: any = {};
    if (shippingAddress) updateData.shippingAddress = shippingAddress;
    if (phoneNumber) updateData.phoneNumber = phoneNumber;

    await order.update(updateData, { transaction: t });
    await t.commit();

    res.status(200).json({
      message: "Cập nhật thông tin giao hàng thành công",
      order,
    });
  } catch (error: any) {
    await t.rollback();
    res.status(500).json({ message: error.message });
  }
};

/**
 * Lấy tất cả đơn hàng với chức năng lọc và tìm kiếm nâng cao (chỉ dành cho admin)
 *
 * Quy trình:
 * 1. Xử lý tham số truy vấn:
 *    - Phân trang (page, limit)
 *    - Lọc theo trạng thái
 *    - Tìm kiếm theo từ khóa (fuzzy search)
 *    - Lọc theo khoảng thời gian
 *
 * 2. Xây dựng điều kiện tìm kiếm:
 *    - Điều kiện cơ bản (trạng thái, thời gian)
 *    - Fuzzy search cho tên và số điện thoại
 *    - Tìm kiếm theo ID đơn hàng
 *    - Tìm kiếm theo email người dùng
 *    - Tìm kiếm theo tên hoặc SKU sản phẩm
 *
 * 3. Thực hiện truy vấn với các mối quan hệ:
 *    - Chi tiết đơn hàng
 *    - Thông tin sản phẩm
 *    - Thông tin người dùng
 *
 * 4. Trả về kết quả:
 *    - Danh sách đơn hàng
 *    - Thông tin phân trang
 *
 * @param req - Request chứa các tham số tìm kiếm và phân trang
 * @param res - Response trả về danh sách đơn hàng và thông tin phân trang
 */
export const getAllOrders = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // ===== STEP 1: Xử lý tham số truy vấn =====
    const {
      page = 1,
      limit = 10,
      status,
      search,
      fromDate,
      toDate,
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    // ===== STEP 2: Xây dựng điều kiện tìm kiếm cơ bản =====
    const baseConditions: any = {};

    // Filter theo status đơn hàng (pending, confirmed, shipped, delivered, cancelled)
    if (status && status !== "all") {
      baseConditions.status = status;
    }

    // Xử lý điều kiện ngày tháng đúng cách
    if (fromDate || toDate) {
      baseConditions.createdAt = {};

      if (fromDate) {
        const startDate = new Date(fromDate as string);
        startDate.setHours(0, 0, 0, 0);
        baseConditions.createdAt[Op.gte] = startDate;
      }

      if (toDate) {
        const endDate = new Date(toDate as string);
        endDate.setHours(23, 59, 59, 999);
        baseConditions.createdAt[Op.lte] = endDate;
      }
    }

    // ===== STEP 3: Xử lý search logic nâng cao (tham khảo getAllOrdersByEmployee) =====
    let whereConditions = { ...baseConditions };

    if (search) {
      const searchTerm = search as string;

      // Detect nếu search term là email (chứa ký tự @)
      const isEmail = searchTerm.includes("@");

      if (isEmail) {
        // ✅ Email search: Tìm trong email của user thông qua association
        whereConditions[Op.or] = [
          { id: { [Op.like]: `%${searchTerm}%` } }, // Tìm trong Order ID
          { shippingPhoneNumber: { [Op.like]: `%${searchTerm}%` } }, // Tìm trong số điện thoại
          { shippingFullName: { [Op.like]: `%${searchTerm}%` } }, // Tìm trong tên người nhận
          { "$user.email$": { [Op.like]: `%${searchTerm}%` } }, // Tìm trong email user
        ];
      } else {
        // ✅ ENHANCED: Fuzzy search for names and phone numbers
        const searchConditions = [];

        // Basic searches (ID, phone, full name match)
        searchConditions.push(
          { id: { [Op.like]: `%${searchTerm}%` } },
          { shippingPhoneNumber: { [Op.like]: `%${searchTerm}%` } },
          { shippingFullName: { [Op.like]: `%${searchTerm}%` } }
        );

        // ✅ FUZZY: Search each word in name independently for better matching
        const searchWords = searchTerm.trim().split(/\s+/);
        searchWords.forEach((word) => {
          if (word.length >= 2) {
            // Only search words with 2+ characters
            searchConditions.push({
              shippingFullName: { [Op.like]: `%${word}%` },
            });
          }
        });

        // Nếu search term là số, thêm điều kiện tìm theo ID
        if (!isNaN(Number(searchTerm))) {
          searchConditions.push({ id: Number(searchTerm) });
        }

        whereConditions[Op.or] = searchConditions;
      }
    }

    // ===== STEP 4: Định nghĩa include options =====
    const includeOptions = [
      {
        model: OrderDetail,
        as: "orderDetails",
        required: false,
        include: [
          {
            model: Product,
            as: "product",
            attributes: ["id", "name"],
            required: false,
          },
          {
            model: ProductDetail,
            as: "productDetail",
            attributes: ["id", "color"],
            required: false,
          },
        ],
      },
      {
        model: Users,
        as: "user",
        attributes: ["id", "email", "username"],
        required: false, // ✅ IMPORTANT: Set to false to avoid inner join issues
      },
    ];

    // ===== STEP 5: Đếm tổng số đơn hàng với điều kiện cơ bản =====
    let count = await Order.count({
      where: whereConditions,
      distinct: true,
      include: includeOptions,
    });

    // ===== STEP 6: Tìm kiếm nâng cao theo email và tên sản phẩm (nếu có search) =====
    if (search && search.toString().length > 0) {
      const searchTerm = `%${search}%`;
      const isEmail = search.toString().includes("@");

      // Nếu không phải email search, thêm tìm kiếm theo email user và product name
      if (!isEmail) {
        // Tìm theo email người dùng
        const ordersWithUserEmail = await Order.findAll({
          attributes: ["id"],
          where: baseConditions, // Giữ điều kiện cơ bản (status, date)
          include: [
            {
              model: Users,
              as: "user",
              where: {
                email: { [Op.like]: searchTerm },
              },
              required: true,
            },
          ],
        });

        // Tìm theo tên sản phẩm
        const ordersWithProductName = await Order.findAll({
          attributes: ["id"],
          where: baseConditions, // Giữ điều kiện cơ bản (status, date)
          include: [
            {
              model: OrderDetail,
              as: "orderDetails",
              include: [
                {
                  model: Product,
                  as: "product",
                  where: {
                    [Op.or]: [
                      { name: { [Op.like]: searchTerm } },
                      { sku: { [Op.like]: searchTerm } },
                    ],
                  },
                  required: true,
                },
              ],
              required: true,
            },
          ],
        });

        // Gộp kết quả từ 2 truy vấn
        const userEmailIds = ordersWithUserEmail.map((order) => order.id);
        const productNameIds = ordersWithProductName.map((order) => order.id);
        const relationIds = [...new Set([...userEmailIds, ...productNameIds])];

        if (relationIds.length > 0) {
          // Thêm điều kiện ID vào điều kiện OR hiện có
          if (whereConditions[Op.or]) {
            whereConditions[Op.or].push({ id: { [Op.in]: relationIds } });
          } else {
            // Nếu chưa có điều kiện OR, tạo mới
            whereConditions = {
              ...baseConditions,
              [Op.or]: [
                ...(whereConditions[Op.or] || []),
                { id: { [Op.in]: relationIds } },
              ],
            };
          }

          // Đếm lại với điều kiện mới
          count = await Order.count({
            where: whereConditions,
            distinct: true,
            include: includeOptions,
          });
        } else if (!whereConditions[Op.or]) {
          // Nếu không tìm thấy kết quả nào và không có điều kiện search cơ bản
          whereConditions = { ...baseConditions, id: -1 };
          count = 0;
        }
      }
    }

    // ===== STEP 7: Lấy danh sách đơn hàng =====
    const orders = await Order.findAll({
      where: whereConditions,
      include: [
        {
          model: OrderDetail,
          as: "orderDetails",
          include: [
            {
              model: ProductDetail,
              as: "productDetail",
              attributes: ["id", "color"],
            },
            {
              model: Product,
              as: "product",
              attributes: ["id", "name"],
            },
          ],
        },
        {
          model: Users,
          as: "user",
          attributes: ["id", "email", "username"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: Number(limit),
      offset,
    });

    // ===== STEP 8: Trả về kết quả =====
    res.status(200).json({
      orders,
      pagination: {
        total: count,
        currentPage: Number(page),
        totalPages: Math.ceil(count / Number(limit)),
        perPage: Number(limit),
      },
    });
  } catch (error: any) {
    console.error("Error in getAllOrders:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Xử lý hoàn tiền cho đơn hàng (chỉ dành cho admin)
 *
 * Quy trình:
 * 1. Tạo transaction để đảm bảo tính toàn vẹn dữ liệu
 * 2. Kiểm tra điều kiện:
 *    - Số tiền hoàn trả phải hợp lệ (> 0)
 *    - Đơn hàng phải tồn tại
 *    - Chỉ hoàn tiền cho đơn hàng đã thanh toán (paymentStatusId = 2)
 * 3. Cập nhật đơn hàng:
 *    - Đổi trạng thái thanh toán thành "refunded" (paymentStatusId = 4)
 *    - Lưu số tiền hoàn trả
 *    - Lưu lý do hoàn tiền
 * 4. Commit transaction và trả về thông tin hoàn tiền
 *
 * @param req - Request chứa ID đơn hàng, số tiền và lý do hoàn tiền
 * @param res - Response trả về kết quả xử lý hoàn tiền
 */
export const processRefund = async (
  req: Request,
  res: Response
): Promise<void> => {
  const t = await sequelize.transaction();
  try {
    // Step 1: Lấy thông tin từ request
    const { id } = req.params;
    const { amount, reason } = req.body;

    // Step 2.1: Kiểm tra số tiền hợp lệ
    if (!amount || amount <= 0) {
      await t.rollback();
      res.status(400).json({ message: "Số tiền hoàn trả không hợp lệ" });
      return;
    }

    // Step 2.2: Kiểm tra đơn hàng tồn tại
    const order = await Order.findByPk(id, { transaction: t });
    if (!order) {
      await t.rollback();
      res.status(404).json({ message: "Đơn hàng không tồn tại" });
      return;
    }

    // Step 2.3: Kiểm tra trạng thái thanh toán
    // Chỉ cho phép hoàn tiền đơn hàng đã thanh toán
    if (order.getDataValue("paymentStatusId") !== 2) {
      // 2 là "Paid"
      await t.rollback();
      res
        .status(400)
        .json({ message: "Chỉ có thể hoàn tiền cho đơn hàng đã thanh toán" });
      return;
    }

    // Step 3: Cập nhật đơn hàng
    // Đặt trạng thái thanh toán thành "refunded"
    await order.update(
      {
        paymentStatusId: 4, // 4 là "Refunded"
        refundAmount: amount,
        refundReason: reason || "Hoàn tiền",
      },
      { transaction: t }
    );

    // Step 4: Commit transaction và trả về kết quả
    await t.commit();

    res.status(200).json({
      message: "Hoàn tiền thành công",
      order: {
        id: order.id,
        refundAmount: amount,
        paymentStatus: "Refunded",
      },
    });
  } catch (error: any) {
    await t.rollback();
    res.status(500).json({ message: error.message });
  }
};

/**
 * Tự động hủy các đơn hàng thanh toán không phải tiền mặt còn pending sau 1 ngày
 *
 * Quy trình:
 * 1. Tìm các đơn hàng có paymentMethodId != 1 (không phải COD)
 * 2. Đơn hàng có trạng thái "pending"
 * 3. Đơn hàng tạo cách đây trên 1 ngày
 * 4. Cập nhật trạng thái đơn hàng thành "cancelled"
 * 5. Cập nhật trạng thái thanh toán thành 5 (cancelled)
 * 6. Hoàn trả số lượng tồn kho
 *
 * @param req - Request
 * @param res - Response
 */
export const autoCancelPendingOrders = async (
  req: Request,
  res: Response
): Promise<void> => {
  const t = await sequelize.transaction();

  try {
    // Step 1: Tạo mốc thời gian để so sánh
    // Tạo một ngày trước từ thời điểm hiện tại
    const oneDayBefore = new Date();
    oneDayBefore.setDate(oneDayBefore.getDate() - 1);

    // Step 2: Tìm các đơn hàng cần hủy
    // Tìm các đơn hàng cần hủy: không phải COD (paymentMethodId != 1),
    // đơn ở trạng thái pending và được tạo cách đây hơn 1 ngày
    const pendingOrders = await Order.findAll({
      where: {
        paymentMethodId: { [Op.ne]: 1 }, // Không phải COD
        status: "pending", // Đơn hàng đang ở trạng thái pending
        createdAt: { [Op.lt]: oneDayBefore }, // Tạo cách đây hơn 1 ngày
      },
      include: [
        {
          model: OrderDetail,
          as: "orderDetails",
        },
      ],
      transaction: t,
    });

    // Step 3: Kiểm tra nếu không có đơn hàng nào cần hủy
    if (pendingOrders.length === 0) {
      await t.commit();
      res.status(200).json({
        message: "Không có đơn hàng nào cần hủy tự động",
        cancelledCount: 0,
      });
      return;
    }

    // Step 4: Xử lý hủy đơn hàng
    let cancelledCount = 0;
    const updatedProductIds = new Set<number>();

    // Xử lý từng đơn hàng
    for (const order of pendingOrders) {
      // Step 4.1: Cập nhật trạng thái đơn hàng thành cancelled và trạng thái thanh toán thành cancelled (5)
      await order.update(
        {
          status: "cancelled",
          paymentStatusId: 5, // Cancelled payment status
          cancelNote: "Tự động hủy do không thanh toán sau 24 giờ",
        },
        { transaction: t }
      );

      // Step 4.2: Hoàn trả số lượng tồn kho
      const orderDetails = (order as any).orderDetails || [];
      for (const detail of orderDetails) {
        const productId = detail.productId;
        updatedProductIds.add(productId);

        // Tìm ProductDetail dựa trên productDetailId hoặc productId và color
        let productDetail;
        if (detail.productDetailId) {
          productDetail = await ProductDetail.findByPk(detail.productDetailId, {
            transaction: t,
          });
        } else {
          productDetail = await ProductDetail.findOne({
            where: { productId, color: detail.color },
            transaction: t,
          });
        }

        if (!productDetail) {
          continue;
        }

        // Step 4.3: Cập nhật lại tồn kho
        const inventory = await ProductInventory.findOne({
          where: { productDetailId: productDetail.id, size: detail.size },
          transaction: t,
        });

        if (inventory) {
          const currentStock = inventory.getDataValue("stock");
          const newStock = currentStock + detail.quantity;
          await inventory.update({ stock: newStock }, { transaction: t });
        } else {
          await ProductInventory.create(
            {
              productDetailId: productDetail.id,
              size: detail.size,
              stock: detail.quantity,
            },
            { transaction: t }
          );
        }
      }

      cancelledCount++;
    }

    // Step 5: Cập nhật lại trạng thái sản phẩm dựa trên tồn kho
    for (const productId of updatedProductIds) {
      try {
        // Step 5.1: Truy vấn trạng thái sản phẩm
        const product = await Product.findByPk(productId, { transaction: t });
        if (!product) {
          continue;
        }

        // Step 5.2: Tính tổng tồn kho bằng Sequelize
        const totalStock =
          (await ProductInventory.sum("stock", {
            where: {
              productDetailId: {
                [Op.in]: sequelize.literal(
                  `(SELECT id FROM product_details WHERE productId = ${productId})`
                ),
              },
            },
            transaction: t,
          })) || 0;

        // Step 5.3: Cập nhật trạng thái sản phẩm
        if (totalStock > 0 && product.status !== "active") {
          await sequelize.query(
            `UPDATE products SET status = 'active', updatedAt = NOW() 
             WHERE id = :productId AND status = 'outofstock'`,
            {
              replacements: { productId },
              type: QueryTypes.UPDATE,
              transaction: t,
            }
          );
        } else if (totalStock === 0 && product.status !== "outofstock") {
          await product.update({ status: "outofstock" }, { transaction: t });
        }
      } catch (error) {
        console.error(
          `[ERROR] Lỗi khi cập nhật trạng thái sản phẩm ID ${productId}:`,
          error
        );
      }
    }

    // Step 6: Commit transaction nếu mọi thứ thành công
    await t.commit();

    // Step 7: Trả về kết quả thành công
    res.status(200).json({
      message: "Đã hủy tự động các đơn hàng quá hạn thanh toán",
      cancelledCount,
      orderIds: pendingOrders.map((order) => order.id),
    });
  } catch (error: any) {
    // Rollback transaction nếu có lỗi
    await t.rollback();
    console.error("[ERROR] Lỗi khi hủy đơn hàng tự động:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: error.message });
  }
};
