import { Request, Response, NextFunction } from "express";
import { Op } from "sequelize";
import Order from "../models/Order";
import OrderDetail from "../models/OrderDetail";
import ProductInventory from "../models/ProductInventory";
import ProductDetail from "../models/ProductDetail";
import Product from "../models/Product";
import sequelize from "../config/db";

// Lưu thời gian kiểm tra cuối cùng
let lastCheckTime = 0;

// Thời gian giữa các lần kiểm tra (15 phút)
const CHECK_INTERVAL = 15 * 60 * 1000;

/**
 * Middleware tự động hủy đơn hàng thanh toán online sau 1 ngày
 *
 * Hủy các đơn hàng thanh toán online (không phải COD)
 * mà khách hàng chưa thanh toán sau 24 giờ
 */
export const checkExpiredPayments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Đảm bảo next() chỉ được gọi một lần
  let nextCalled = false;

  const callNext = () => {
    if (!nextCalled) {
      nextCalled = true;
      next();
    }
  };

  try {
    const currentTime = Date.now();

    // Kiểm tra nếu chưa đến thời gian để chạy lại
    if (currentTime - lastCheckTime < CHECK_INTERVAL) {
      return callNext();
    }

    // Cập nhật thời gian kiểm tra cuối cùng
    lastCheckTime = currentTime;

    // Tính thời điểm 24 giờ trước
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    // Bắt đầu transaction để đảm bảo tính nhất quán dữ liệu
    const transaction = await sequelize.transaction();

    try {
      // Tìm các đơn hàng cần hủy
      const pendingOrders = await Order.findAll({
        where: {
          paymentMethodId: { [Op.ne]: 1 }, // Không phải COD
          status: "pending", // Đơn hàng đang chờ
          createdAt: { [Op.lt]: oneDayAgo }, // Tạo trước 24 giờ
          paymentStatusId: 1, // Chưa thanh toán
        },
        include: [
          {
            model: OrderDetail,
            as: "orderDetails",
          },
        ],
        transaction,
      });

      // Nếu không có đơn hàng nào cần hủy
      if (pendingOrders.length === 0) {
        await transaction.commit();
        return callNext();
      }

      // Xử lý từng đơn hàng
      for (const order of pendingOrders) {
        // Cập nhật trạng thái đơn hàng
        await order.update(
          {
            status: "cancelled",
            paymentStatusId: 5, // Đã hủy thanh toán
            cancelNote: "Tự động hủy do không thanh toán sau 24 giờ",
          },
          { transaction }
        );

        // Hoàn trả sản phẩm vào kho
        const orderDetails = order.getDataValue("orderDetails");

        for (const item of orderDetails) {
          const productInventory = await ProductInventory.findByPk(
            item.productInventoryId,
            { transaction }
          );

          if (productInventory) {
            // Tăng số lượng tồn kho
            const newQuantity =
              productInventory.getDataValue("quantity") + item.quantity;
            await productInventory.update(
              { quantity: newQuantity },
              { transaction }
            );

            // Cập nhật trạng thái sản phẩm
            const productDetail = await ProductDetail.findByPk(
              productInventory.getDataValue("productDetailId"),
              { transaction }
            );

            if (productDetail) {
              const inventories = await ProductInventory.findAll({
                where: { productDetailId: productDetail.id },
                transaction,
              });

              const totalQuantity = inventories.reduce(
                (sum, inv) => sum + inv.getDataValue("quantity"),
                0
              );

              // Cập nhật trạng thái sản phẩm chi tiết
              if (
                totalQuantity > 0 &&
                productDetail.getDataValue("status") === "out_of_stock"
              ) {
                await productDetail.update(
                  { status: "active" },
                  { transaction }
                );

                // Cập nhật trạng thái sản phẩm chính
                const product = await Product.findByPk(
                  productDetail.getDataValue("productId"),
                  { transaction }
                );

                if (
                  product &&
                  product.getDataValue("status") === "out_of_stock"
                ) {
                  await product.update({ status: "active" }, { transaction });
                }
              }
            }
          }
        }
      }

      // Hoàn tất transaction
      await transaction.commit();
      callNext();
    } catch (error) {
      // Hoàn tác transaction nếu có lỗi
      await transaction.rollback();
      console.error("Lỗi khi hủy đơn hàng quá hạn:", error);
      callNext();
    }
  } catch (error) {
    console.error("Lỗi khi kiểm tra đơn hàng quá hạn:", error);
    callNext();
  }
};
