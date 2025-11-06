import { Request, Response } from "express";
import sequelize from "../config/db";
import { Op, QueryTypes } from "sequelize";
import Order from "../models/Order";
import OrderDetail from "../models/OrderDetail";
import ProductInventory from "../models/ProductInventory";
import ProductDetail from "../models/ProductDetail";
import Voucher from "../models/Voucher";
import Product from "../models/Product";
import ProductImage from "../models/ProductImage";
import Users from "../models/Users";
import { sendOrderConfirmationEmail } from "../services/orderEmailService";

/**
 * Tạo mới một đơn hàng
 * Flow:
 * Step 1: Bắt đầu một transaction để đảm bảo tính toàn vẹn dữ liệu
 * Step 2: Lấy thông tin đơn hàng từ request body
 * Step 3: Kiểm tra và validate dữ liệu đầu vào
 * Step 4: Kiểm tra tồn kho và tính tổng tiền cho đơn hàng
 * Step 5: Áp dụng voucher nếu có
 * Step 6: Tính phí vận chuyển
 * Step 7: Tạo đơn hàng mới trong database
 * Step 8: Tạo chi tiết đơn hàng và cập nhật tồn kho
 * Step 9: Cập nhật trạng thái sản phẩm nếu hết hàng
 * Step 10: Hoàn tất transaction và trả về kết quả
 */
export const createOrder = async (
  req: Request,
  res: Response
): Promise<void> => {
  // Step 1: Bắt đầu một transaction để đảm bảo tính toàn vẹn dữ liệu
  const t = await sequelize.transaction();

  try {
    // Step 2: Lấy thông tin đơn hàng từ request body
    const {
      items,
      paymentMethodId,
      voucherCode,
      shippingFullName,
      shippingPhoneNumber,
      shippingStreetAddress,
      shippingWard,
      shippingDistrict,
      shippingCity,
      userId,
    } = req.body;
    console.log("body", req.body);

    // Step 3: Kiểm tra và validate dữ liệu đầu vào
    if (!items || !items.length) {
      await t.rollback();
      res.status(400).json({ message: "Giỏ hàng trống" });
      return;
    }

    // Validate số điện thoại Việt Nam
    const phoneRegex = /^(0[3|5|7|8|9]|[1-9][0-9])[0-9]{8,14}$/;
    if (!phoneRegex.test(shippingPhoneNumber)) {
      await t.rollback();
      res.status(400).json({ message: "Số điện thoại không hợp lệ" });
      return;
    }

    // Step 4: Kiểm tra tồn kho và tính tổng tiền cho đơn hàng
    let total = 0;
    const orderItems = [];
    for (const item of items) {
      // Step 4.1: Kiểm tra sản phẩm tồn tại và có màu phù hợp
      const productDetail = await ProductDetail.findOne({
        where: { productId: item.productId, color: item.color },
        transaction: t,
        include: [
          { model: Product, as: "product" },
          {
            model: ProductImage,
            as: "images",
            where: { isMain: true },
            required: false,
            limit: 1,
          },
        ],
      });

      if (!productDetail) {
        await t.rollback();
        res.status(404).json({
          message: `Sản phẩm ID ${item.productId} với màu ${item.color} không tồn tại`,
        });
        return;
      }

      // Step 4.2: Kiểm tra kích thước và tồn kho
      const inventory = await ProductInventory.findOne({
        where: {
          productDetailId: productDetail.id,
          size: item.size,
        },
        transaction: t,
      });

      if (!inventory) {
        await t.rollback();
        res.status(404).json({
          message: `Size ${item.size} cho sản phẩm với màu ${item.color} không tồn tại`,
        });
        return;
      }

      // Step 4.3: Kiểm tra số lượng tồn kho có đủ không
      if (inventory.getDataValue("stock") < item.quantity) {
        await t.rollback();
        res.status(400).json({
          message: `Số lượng sản phẩm không đủ. Hiện sản phẩm ${
            productDetail.getDataValue("product").name
          } chỉ còn ${inventory.getDataValue("stock")} sản phẩm.`,
        });
        return;
      } // Step 4.4: Lấy giá sản phẩm và tính toán
      const price = productDetail.getDataValue("price");
      const originalPrice =
        productDetail.getDataValue("originalPrice") || price;

      // Step 4.5: Tính phần trăm giảm giá
      const discountPercent =
        originalPrice > 0 ? Math.round((1 - price / originalPrice) * 100) : 0;

      // Step 4.6: Tính tổng tiền cho sản phẩm
      const itemTotal = price * item.quantity;
      total += itemTotal;

      // Step 4.7: Lấy URL hình ảnh chính của sản phẩm
      const mainImage =
        (productDetail as any).images &&
        (productDetail as any).images.length > 0
          ? (productDetail as any).images[0].url
          : null;

      // Step 4.8: Thêm vào mảng các mặt hàng đơn hàng
      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        color: item.color,
        size: item.size,
        originalPrice: originalPrice,
        discountPrice: price,
        discountPercent: discountPercent,
        imageUrl: mainImage,
        productDetailId: productDetail.id,
        inventoryId: inventory.getDataValue("id"),
      });
    }

    // Step 5: Áp dụng voucher nếu có
    let voucherDiscount = 0;
    let appliedVoucher = null;
    if (voucherCode) {
      // Step 5.1: Tìm voucher hợp lệ trong database
      const voucher = await Voucher.findOne({
        where: {
          code: voucherCode,
          status: "active",
          minOrderValue: { [Op.lte]: total },
          expirationDate: { [Op.gte]: new Date() },
        },
        transaction: t,
      });

      if (!voucher) {
        await t.rollback();
        res.status(404).json({ message: "Voucher không tồn tại" });
        return;
      }

      // Step 5.2: Kiểm tra hạn sử dụng
      if (new Date(voucher.getDataValue("expirationDate")) < new Date()) {
        await t.rollback();
        res.status(400).json({ message: "Voucher đã hết hạn" });
        return;
      }

      // Step 5.3: Tính giảm giá dựa trên loại voucher
      if (voucher.getDataValue("type") === "percentage") {
        voucherDiscount = (total * voucher.getDataValue("value")) / 100;
      } else {
        voucherDiscount = voucher.getDataValue("value");
      }

      // Step 5.4: Không cho phép giảm giá lớn hơn tổng đơn hàng
      voucherDiscount = Math.min(voucherDiscount, total);
      appliedVoucher = voucher;

      // Step 5.5: Cập nhật số lần sử dụng của voucher
      const currentUsageCount = voucher.getDataValue("usageCount") || 0;
      await voucher.update(
        {
          usageCount: currentUsageCount + 1,
        },
        { transaction: t }
      );

      // Step 5.6: Kiểm tra giới hạn sử dụng và cập nhật trạng thái nếu cần
      const usageLimit = voucher.getDataValue("usageLimit");
      if (usageLimit > 0 && currentUsageCount + 1 >= usageLimit) {
        // Nếu đạt giới hạn sử dụng, đổi trạng thái voucher thành "inactive"
        await voucher.update({ status: "inactive" }, { transaction: t });
        console.log(
          `Voucher ${voucherCode} đã đạt giới hạn sử dụng và được cập nhật thành trạng thái inactive`
        );
      }
    }

    // Step 6: Tính phí vận chuyển
    const shippingCalculation = calculateShippingFee(total, shippingCity);
    const shippingFee = shippingCalculation.finalFee;

    // Step 6.1: Tính tổng tiền sau khi áp dụng voucher
    const finalTotal = total - voucherDiscount; // Step 7: Tạo đơn hàng mới trong database
    const newOrder = await Order.create(
      {
        userId,
        total: finalTotal + shippingFee,
        status: "pending",
        paymentMethodId,
        paymentStatusId: 1, // pending
        shippingFullName,
        shippingPhoneNumber,
        shippingStreetAddress,
        shippingWard,
        shippingDistrict,
        shippingCity,
        voucherDiscount: voucherDiscount,
        subtotal: total,
        shippingFee: shippingFee,
        shippingBasePrice: shippingCalculation.baseFee, // Lưu phí gốc
        shippingDiscount: shippingCalculation.discount, // Lưu khoản giảm giá
      },
      { transaction: t }
    );

    // Step 8: Tạo chi tiết đơn hàng và cập nhật tồn kho
    for (const item of orderItems) {
      // Step 8.1: Tạo chi tiết đơn hàng
      await OrderDetail.create(
        {
          orderId: newOrder.id,
          productId: item.productId,
          productDetailId: item.productDetailId,
          quantity: item.quantity,
          color: item.color,
          size: item.size,
          originalPrice: item.originalPrice,
          discountPrice: item.discountPrice,
          discountPercent: item.discountPercent,
          voucherId: appliedVoucher ? appliedVoucher.id : null,
          imageUrl: item.imageUrl,
        },
        { transaction: t }
      );

      // Step 8.2: Cập nhật tồn kho - giảm số lượng tồn kho
      const inventory = await ProductInventory.findByPk(item.inventoryId, {
        transaction: t,
      });
      if (inventory) {
        await inventory.update(
          {
            stock: inventory.getDataValue("stock") - item.quantity,
          },
          { transaction: t }
        );
      }
    } // Step 9: Cập nhật trạng thái sản phẩm nếu hết hàng
    // Step 9.1: Theo dõi các sản phẩm đã cập nhật và biến thể hết hàng
    const updatedProductIds = new Set();
    const outOfStockDetails = new Set();

    // Step 9.2: Kiểm tra tồn kho của các biến thể sản phẩm
    for (const item of orderItems) {
      // Kiểm tra tồn kho của biến thể hiện tại
      const totalVariantStock = await ProductInventory.sum("stock", {
        where: { productDetailId: item.productDetailId },
        transaction: t,
      });

      // Lưu lại thông tin về biến thể hết hàng
      if (totalVariantStock === 0) {
        outOfStockDetails.add(item.productDetailId);
      }

      // Lấy thông tin về productId của biến thể này
      const productDetail = await ProductDetail.findByPk(item.productDetailId, {
        attributes: ["productId"],
        transaction: t,
      });

      if (productDetail) {
        updatedProductIds.add(productDetail.productId);
      }
    }

    // Step 9.3: Kiểm tra và cập nhật trạng thái của từng sản phẩm chính
    for (const productId of updatedProductIds) {
      // Lấy tất cả biến thể của sản phẩm
      const details = await ProductDetail.findAll({
        where: { productId },
        attributes: ["id"],
        transaction: t,
      });

      // Kiểm tra tồn kho của từng biến thể
      const totalDetailCount = details.length;
      let outOfStockCount = 0;

      for (const detail of details) {
        const stockSum = await ProductInventory.sum("stock", {
          where: { productDetailId: detail.id },
          transaction: t,
        });

        if (stockSum === 0) {
          outOfStockCount++;
        }
      }
      console.log("totalDetailCount", totalDetailCount);

      // Step 9.4: Cập nhật trạng thái sản phẩm
      // Nếu tất cả biến thể đều hết hàng, cập nhật trạng thái sản phẩm thành "outofstock"
      if (totalDetailCount > 0 && totalDetailCount === outOfStockCount) {
        await Product.update(
          { status: "outofstock" },
          { where: { id: productId }, transaction: t }
        );
        console.log(
          `Sản phẩm ID ${productId} đã được cập nhật thành hết hàng.`
        );
      } else {
        // Nếu còn ít nhất một biến thể còn hàng, đảm bảo sản phẩm ở trạng thái "active"
        const product = await Product.findByPk(productId as number, {
          transaction: t,
        });
        if (product && product.status === "outofstock") {
          await Product.update(
            { status: "active" },
            { where: { id: productId }, transaction: t }
          );
          console.log(
            `Sản phẩm ID ${productId} đã được cập nhật thành còn hàng.`
          );
        }
      }
    }

    // Step 10: Hoàn tất transaction và trả về kết quả
    await t.commit();

    // Step 11: Gửi email xác nhận đơn hàng (không đồng bộ)
    // Chỉ gửi email nếu có userId (người dùng đã đăng nhập)
    if (userId) {
      // Gửi email bất đồng bộ để không làm chậm response
      setImmediate(() => {
        sendOrderConfirmationEmail(newOrder.id);
      });
    }

    res.status(201).json({
      message: "Đặt hàng thành công",
      orderId: newOrder.id,
    });
  } catch (error: any) {
    await t.rollback();
    console.error("Error creating order:", error);
    res.status(500).json({
      message: "Đã xảy ra lỗi khi tạo đơn hàng",
      error: error.message,
    });
  }
};

/**
 * Lấy danh sách đơn hàng của người dùng hiện tại
 * Flow:
 * Step 1: Kiểm tra xác thực người dùng
 * Step 2: Lấy thông tin phân trang và bộ lọc từ request
 * Step 3: Xây dựng điều kiện truy vấn
 * Step 4: Đếm tổng số đơn hàng theo điều kiện
 * Step 5: Lấy danh sách đơn hàng với phân trang
 * Step 6: Trả về danh sách đơn hàng và thông tin phân trang
 */
export const getUserOrders = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Step 1: Kiểm tra xác thực người dùng
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    const userId = req.user.id;

    // Step 2: Lấy thông tin phân trang và bộ lọc từ request
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // Step 3: Xây dựng điều kiện truy vấn
    const where: any = { userId };
    if (req.query.status) {
      where.status = req.query.status;
    }

    // Step 4: Đếm tổng số đơn hàng theo điều kiện
    const count = await Order.count({ where });

    // Step 5: Lấy danh sách đơn hàng với phân trang
    const orders = await Order.findAll({
      where,
      include: [
        {
          model: OrderDetail,
          as: "orderDetails",
          include: [
            {
              model: Product,
              as: "product",
              attributes: ["id", "name"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    // Step 6: Trả về danh sách đơn hàng và thông tin phân trang
    res.status(200).json({
      orders,
      pagination: {
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        perPage: limit,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get order details by ID
 * Lấy chi tiết đơn hàng theo ID
 * Flow:
 * Step 1: Lấy ID đơn hàng từ request params
 * Step 2: Truy vấn database để tìm đơn hàng theo ID
 * Step 3: Kèm theo thông tin chi tiết đơn hàng và thông tin sản phẩm
 * Step 4: Kiểm tra nếu không tìm thấy đơn hàng
 * Step 5: Trả về thông tin chi tiết đơn hàng
 */
export const getOrderById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Step 1: Lấy ID đơn hàng từ request params
    const orderId = parseInt(req.params.id);

    // Step 2: Truy vấn database để tìm đơn hàng theo ID
    // Step 3: Kèm theo thông tin chi tiết đơn hàng và thông tin sản phẩm
    const order = await Order.findByPk(orderId, {
      include: [
        {
          model: OrderDetail,
          as: "orderDetails",
          include: [
            {
              model: Product,
              as: "product",
              attributes: ["id", "name", "sku"],
            },
            {
              model: Voucher,
              as: "voucher",
              attributes: ["id", "code", "type", "value"],
            },
          ],
        },
      ],
    });

    // Step 4: Kiểm tra nếu không tìm thấy đơn hàng
    if (!order) {
      res.status(404).json({ message: "Đơn hàng không tồn tại" });
      return;
    }

    // Step 5: Trả về thông tin chi tiết đơn hàng
    res.status(200).json(order);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Calculate shipping fee based on order total and shipping address
 * Tính phí vận chuyển dựa trên tổng giá trị đơn hàng và địa chỉ giao hàng
 * Flow:
 * Step 1: Tính phí giao hàng cơ bản dựa trên địa điểm
 * Step 2: Áp dụng phí cho các khu vực khác nhau (TP.HCM, Hà Nội, tỉnh thành khác)
 * Step 3: Tính toán giảm giá vận chuyển cho đơn hàng lớn
 * Step 4: Tính phí vận chuyển cuối cùng
 * Step 5: Trả về thông tin chi tiết về phí vận chuyển
 *
 * @param subtotal Tổng giá trị đơn hàng trước phí vận chuyển
 * @param shippingAddress Địa chỉ giao hàng
 * @returns Thông tin chi tiết về phí vận chuyển
 */
const calculateShippingFee = (
  subtotal: number,
  shippingAddress: string
): { baseFee: number; discount: number; finalFee: number } => {
  // Step 1: Tính phí giao hàng cơ bản dựa trên địa điểm
  let baseFee = 30000;

  // Step 2: Áp dụng phí cho các khu vực khác nhau
  if (
    shippingAddress.toLowerCase().includes("hồ chí minh") ||
    shippingAddress.toLowerCase().includes("ho chi minh") ||
    shippingAddress.toLowerCase().includes("hcm")
  ) {
    baseFee = 50000; // Phí trong TP.HCM
  } else if (
    shippingAddress.toLowerCase().includes("hà nội") ||
    shippingAddress.toLowerCase().includes("ha noi")
  ) {
    baseFee = 100000; // Phí giao đến Hà Nội
  } else {
    baseFee = 120000; // Phí giao đến tỉnh thành khác
  }

  // Step 3: Tính toán giảm giá vận chuyển cho đơn hàng lớn
  // Miễn phí vận chuyển cho đơn hàng từ 1,000,000đ (tối đa 100,000đ)
  let discount = 0;
  if (subtotal >= 1000000) {
    discount = Math.min(baseFee, 100000);
  }

  // Step 4: Tính phí vận chuyển cuối cùng
  const finalFee = baseFee - discount;

  // Step 5: Trả về thông tin chi tiết về phí vận chuyển
  return {
    baseFee,
    discount,
    finalFee,
  };
};

/**
 * Calculate shipping fee for current cart
 * Tính phí vận chuyển cho giỏ hàng hiện tại
 * Flow:
 * Step 1: Lấy tổng giá trị giỏ hàng và địa chỉ giao hàng từ request
 * Step 2: Kiểm tra dữ liệu đầu vào
 * Step 3: Tính toán phí vận chuyển dựa trên tổng giá trị và địa chỉ
 * Step 4: Trả về thông tin chi tiết về phí vận chuyển
 */
export const calculateShippingFeeForCart = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Step 1: Lấy tổng giá trị giỏ hàng và địa chỉ giao hàng từ request
    const { subtotal, shippingAddress } = req.body;

    // Step 2: Kiểm tra dữ liệu đầu vào
    if (!subtotal || !shippingAddress) {
      res.status(400).json({
        message: "Vui lòng cung cấp giá trị đơn hàng và địa chỉ giao hàng",
      });
      return;
    }

    // Step 3: Tính toán phí vận chuyển dựa trên tổng giá trị và địa chỉ
    const shippingCalculation = calculateShippingFee(subtotal, shippingAddress);

    // Step 4: Trả về thông tin chi tiết về phí vận chuyển
    res.status(200).json({
      shipping: {
        baseFee: shippingCalculation.baseFee,
        discount: shippingCalculation.discount,
        finalFee: shippingCalculation.finalFee,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Lấy đơn hàng của một user cụ thể (chỉ dành cho admin)
/**
 * Lấy đơn hàng của một người dùng cụ thể (dành cho admin)
 * Flow:
 * Step 1: Kiểm tra quyền truy cập (chỉ admin và employee mới có quyền)
 * Step 2: Lấy ID của người dùng từ params
 * Step 3: Kiểm tra xem người dùng có tồn tại không
 * Step 4: Lấy thông tin phân trang và bộ lọc từ request
 * Step 5: Xây dựng điều kiện truy vấn (userId, status, orderId, khoảng thời gian)
 * Step 6: Đếm tổng số đơn hàng theo điều kiện
 * Step 7: Lấy danh sách đơn hàng với phân trang
 * Step 8: Trả về danh sách đơn hàng và thông tin phân trang
 */
export const getUserOrdersByAdmin = async (req: Request, res: Response) => {
  try {
    // Step 1: Kiểm tra quyền truy cập (chỉ admin và employee mới có quyền)
    if (!req.user || (req.user.role !== 1 && req.user.role !== 2)) {
      res.status(403).json({ message: "Không có quyền truy cập" });
      return;
    }

    // Step 2: Lấy ID của người dùng từ params
    const { userId } = req.params;

    // Step 3: Kiểm tra xem người dùng có tồn tại không
    const user = await Users.findByPk(userId, {
      attributes: { exclude: ["password"] },
    });

    if (!user) {
      res.status(404).json({ message: "Người dùng không tồn tại" });
      return;
    }

    // Step 4: Lấy thông tin phân trang và bộ lọc từ request
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // Step 5: Xây dựng điều kiện truy vấn
    const where: any = { userId };

    // Điều kiện lọc theo trạng thái (nếu có)
    if (req.query.status) {
      where.status = req.query.status;
    }

    // Điều kiện lọc ID đơn hàng (nếu có)
    if (req.query.orderId) {
      where.id = req.query.orderId;
    }

    // Điều kiện lọc theo khoảng thời gian (nếu có)
    if (req.query.startDate || req.query.endDate) {
      where.createdAt = {};

      // Nếu có startDate
      if (req.query.startDate) {
        const startDate = new Date(req.query.startDate as string);
        startDate.setHours(0, 0, 0, 0);
        where.createdAt[Op.gte] = startDate;
      }

      // Nếu có endDate
      if (req.query.endDate) {
        const endDate = new Date(req.query.endDate as string);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt[Op.lte] = endDate;
      }
    }
    // Nếu chỉ có orderDate
    else if (req.query.orderDate) {
      const orderDate = new Date(req.query.orderDate as string);
      where.createdAt = {
        [Op.gte]: new Date(orderDate.setHours(0, 0, 0, 0)),
        [Op.lte]: new Date(orderDate.setHours(23, 59, 59, 999)),
      };
    }

    // Step 6: Đếm tổng số đơn hàng theo điều kiện
    const count = await Order.count({ where });

    // Step 7: Lấy danh sách đơn hàng với phân trang
    const orders = await Order.findAll({
      where,
      include: [
        {
          model: OrderDetail,
          as: "orderDetails",
          include: [
            {
              model: Product,
              as: "product",
              attributes: ["id", "name"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    // Step 8: Trả về danh sách đơn hàng và thông tin phân trang
    res.status(200).json({
      orders,
      pagination: {
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        perPage: limit,
      },
    });
  } catch (error: any) {
    console.error("Error in getUserOrdersByAdmin:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Lấy tất cả đơn hàng cho nhân viên với tính năng lọc và phân trang
 * Flow:
 * Step 1: Lấy và xử lý parameters từ request query
 * Step 2: Xây dựng điều kiện WHERE cho database query
 * Step 3: Xử lý search logic (email vs text thông thường)
 * Step 4: Áp dụng date range filter
 * Step 5: Thiết lập include options cho Sequelize associations
 * Step 6: Đếm tổng số records thỏa mãn điều kiện
 * Step 7: Lấy dữ liệu đơn hàng với pagination
 * Step 8: Xử lý privacy protection cho thông tin khách hàng
 * Step 9: Trả về response với format chuẩn
 */
export const getAllOrdersByEmployee = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // ===== STEP 1: Lấy và xử lý parameters từ request query =====
    const {
      page = 1, // Trang hiện tại (default: 1)
      limit = 10, // Số items per page (default: 10)
      status, // Filter theo trạng thái đơn hàng
      search, // Từ khóa tìm kiếm
      fromDate, // Ngày bắt đầu filter
      toDate, // Ngày kết thúc filter
    } = req.query;

    // Tính offset cho pagination
    const offset = (Number(page) - 1) * Number(limit);

    // ===== STEP 2: Xây dựng điều kiện WHERE cho database query =====
    const whereConditions: any = {};

    // Filter theo status đơn hàng (pending, confirmed, shipped, delivered, cancelled)
    if (status && status !== "all") {
      whereConditions.status = status;
    }

    // ===== STEP 3: Xử lý search logic (email vs text thông thường) =====
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
        // ✅ Text search: Tìm trong các field thông thường
        whereConditions[Op.or] = [
          { id: { [Op.like]: `%${searchTerm}%` } }, // Order ID
          { shippingPhoneNumber: { [Op.like]: `%${searchTerm}%` } }, // Số điện thoại
          { shippingFullName: { [Op.like]: `%${searchTerm}%` } }, // Tên người nhận
        ];
      }
    }

    // ===== STEP 4: Áp dụng date range filter =====
    if (fromDate || toDate) {
      whereConditions.createdAt = {};

      // Ngày bắt đầu: set time to 00:00:00
      if (fromDate) {
        const startDate = new Date(fromDate as string);
        startDate.setHours(0, 0, 0, 0);
        whereConditions.createdAt[Op.gte] = startDate;
      }

      // Ngày kết thúc: set time to 23:59:59
      if (toDate) {
        const endDate = new Date(toDate as string);
        endDate.setHours(23, 59, 59, 999);
        whereConditions.createdAt[Op.lte] = endDate;
      }
    }

    // ===== STEP 5: Thiết lập include options cho Sequelize associations =====
    const includeOptions = [
      {
        model: OrderDetail,
        as: "orderDetails",
        required: false, // LEFT JOIN (không bắt buộc phải có order details)
        include: [
          {
            model: Product,
            as: "product",
            attributes: ["id", "name"], // Chỉ lấy id và name của sản phẩm
            required: false,
          },
          {
            model: ProductDetail,
            as: "productDetail",
            attributes: ["id", "color"], // Chỉ lấy id và color của product detail
            required: false,
          },
        ],
      },
      {
        model: Users,
        as: "user",
        attributes: ["id", "email", "username"], // Chỉ lấy thông tin cần thiết của user
        required: false, // LEFT JOIN (không bắt buộc, tránh mất data khi user bị xóa)
      },
    ];

    // ===== STEP 6: Đếm tổng số records thỏa mãn điều kiện =====
    const count = await Order.count({
      where: whereConditions,
      distinct: true, // Đếm distinct để tránh duplicate khi có nhiều order details
      include: includeOptions,
    });

    // ===== STEP 7: Lấy dữ liệu đơn hàng với pagination =====
    const orders = await Order.findAll({
      where: whereConditions,
      include: includeOptions,
      order: [["createdAt", "DESC"]], // Sắp xếp theo ngày tạo mới nhất
      limit: Number(limit),
      offset,
    });

    // ===== STEP 8: Xử lý privacy protection cho thông tin khách hàng =====
    // Nhân viên không được xem đầy đủ thông tin cá nhân của khách hàng
    const modifiedOrders = orders.map((order) => {
      const user = (order as any).user || {};
      const userEmail = user.email || "";
      const userPhoneNumber = order.shippingPhoneNumber || ""; // Fix: dùng đúng field name

      return {
        ...order.get(),
        user: {
          id: user.id,
          username: user.username,
          // ✅ Email masking: chỉ hiện 4 ký tự đầu và 4 ký tự cuối trước @
          // Ví dụ: user@example.com → user...ple@example.com
          email:
            userEmail.length > 8
              ? `${userEmail.slice(0, 4)}...${userEmail.slice(
                  userEmail.indexOf("@") - 4
                )}`
              : userEmail,
        },
        // ✅ Phone masking: chỉ hiện 4 số đầu và 3 số cuối
        // Ví dụ: 0901234567 → 0901...567
        phoneNumber:
          userPhoneNumber.length > 7
            ? `${userPhoneNumber.slice(0, 4)}...${userPhoneNumber.slice(-3)}`
            : userPhoneNumber,
      };
    });

    // ===== STEP 9: Trả về response với format chuẩn =====
    res.status(200).json({
      orders: modifiedOrders,
      pagination: {
        total: count, // Tổng số records
        currentPage: Number(page), // Trang hiện tại
        totalPages: Math.ceil(count / Number(limit)), // Tổng số trang
        perPage: Number(limit), // Số items per page
      },
    });
  } catch (error: any) {
    console.error("Error in getAllOrdersByEmployee:", error);
    res.status(500).json({ message: error.message });
  }
};
