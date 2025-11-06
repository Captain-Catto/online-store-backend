import { sendEmail } from "../utils/email";
import Order from "../models/Order";
import OrderDetail from "../models/OrderDetail";
import Product from "../models/Product";
import Users from "../models/Users";

// Email Templates
export const createOrderConfirmationEmailTemplate = (
  orderData: any,
  customerName: string
) => {
  const orderItemsHtml = orderData.orderDetails
    .map(
      (item: any) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">
        ${item.product?.name || "Sản phẩm"}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">
        ${item.color} - ${item.size}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">
        ${item.quantity}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
        ${(item.discountPrice || item.originalPrice).toLocaleString(
          "vi-VN"
        )} VND
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
        ${(
          (item.discountPrice || item.originalPrice) * item.quantity
        ).toLocaleString("vi-VN")} VND
      </td>
    </tr>
  `
    )
    .join("");

  return {
    subject: `Xác nhận đơn hàng #${orderData.id} - Online Store`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Xác nhận đơn hàng</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .order-details { background-color: #f8f9fa; padding: 15px; margin: 20px 0; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background-color: #e9ecef; padding: 12px; text-align: left; }
          .total-row { font-weight: bold; background-color: #f8f9fa; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="color: #007bff; margin: 0;">Online Store</h1>
            <h2 style="color: #28a745; margin: 10px 0;">Xác nhận đơn hàng</h2>
          </div>
          
          <div class="content">
            <p>Xin chào <strong>${customerName}</strong>,</p>
            <p>Cảm ơn bạn đã đặt hàng tại Online Store. Đơn hàng của bạn đã được tiếp nhận và đang được xử lý.</p>
            
            <div class="order-details">
              <h3>Thông tin đơn hàng</h3>
              <p><strong>Mã đơn hàng:</strong> #${orderData.id}</p>
              <p><strong>Ngày đặt:</strong> ${new Date(
                orderData.createdAt
              ).toLocaleDateString("vi-VN")}</p>
              <p><strong>Trạng thái:</strong> Đang xử lý</p>
              <p><strong>Phương thức thanh toán:</strong> ${
                orderData.paymentMethodId === 1
                  ? "COD (Thanh toán khi nhận hàng)"
                  : "Chuyển khoản"
              }</p>
            </div>
            
            <h3>Chi tiết sản phẩm</h3>
            <table>
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th style="text-align: center;">Biến thể</th>
                  <th style="text-align: center;">Số lượng</th>
                  <th style="text-align: right;">Đơn giá</th>
                  <th style="text-align: right;">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                ${orderItemsHtml}
                <tr class="total-row">
                  <td colspan="4" style="padding: 10px; text-align: right;">Tạm tính:</td>
                  <td style="padding: 10px; text-align: right;">${orderData.subtotal.toLocaleString(
                    "vi-VN"
                  )} VND</td>
                </tr>
                <tr class="total-row">
                  <td colspan="4" style="padding: 10px; text-align: right;">Phí vận chuyển:</td>
                  <td style="padding: 10px; text-align: right;">${(
                    orderData.shippingFee || 0
                  ).toLocaleString("vi-VN")} VND</td>
                </tr>
                ${
                  orderData.voucherDiscount > 0
                    ? `
                <tr class="total-row">
                  <td colspan="4" style="padding: 10px; text-align: right;">Giảm giá:</td>
                  <td style="padding: 10px; text-align: right; color: #dc3545;">-${orderData.voucherDiscount.toLocaleString(
                    "vi-VN"
                  )} VND</td>
                </tr>
                `
                    : ""
                }
                <tr class="total-row" style="font-size: 16px;">
                  <td colspan="4" style="padding: 15px; text-align: right;">Tổng cộng:</td>
                  <td style="padding: 15px; text-align: right; color: #007bff;">${orderData.total.toLocaleString(
                    "vi-VN"
                  )} VND</td>
                </tr>
              </tbody>
            </table>
            
            <div class="order-details">
              <h3>Thông tin giao hàng</h3>
              <p><strong>Người nhận:</strong> ${orderData.shippingFullName}</p>
              <p><strong>Số điện thoại:</strong> ${
                orderData.shippingPhoneNumber
              }</p>
              <p><strong>Địa chỉ:</strong> ${
                orderData.shippingStreetAddress
              }, ${orderData.shippingWard}, ${orderData.shippingDistrict}, ${
      orderData.shippingCity
    }</p>
            </div>
            
            <p><strong>Thông tin quan trọng:</strong></p>
            <ul>
              <li>Đơn hàng sẽ được xử lý trong vòng 1-2 ngày làm việc</li>
              <li>Bạn sẽ nhận được thông báo khi đơn hàng được giao cho đơn vị vận chuyển</li>
              <li>Thời gian giao hàng dự kiến: 2-5 ngày làm việc</li>
              ${
                orderData.paymentMethodId === 1
                  ? "<li>Bạn sẽ thanh toán khi nhận hàng (COD)</li>"
                  : "<li>Vui lòng hoàn tất thanh toán để đơn hàng được xử lý</li>"
              }
            </ul>
            
            <p>Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi qua email hoặc hotline hỗ trợ.</p>
            
            <p>Trân trọng,<br>Đội ngũ Online Store</p>
          </div>
          
          <div class="footer">
            <p>© 2024 Online Store. Tất cả quyền được bảo lưu.</p>
            <p>Email này được gửi tự động, vui lòng không trả lời.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Xin chào ${customerName},
      
      Cảm ơn bạn đã đặt hàng tại Online Store.
      
      Thông tin đơn hàng:
      - Mã đơn hàng: #${orderData.id}
      - Ngày đặt: ${new Date(orderData.createdAt).toLocaleDateString("vi-VN")}
      - Tổng tiền: ${orderData.total.toLocaleString("vi-VN")} VND
      
      Đơn hàng của bạn đang được xử lý và sẽ được giao trong 2-5 ngày làm việc.
      
      Trân trọng,
      Đội ngũ Online Store
    `,
  };
};

export const createOrderStatusUpdateEmailTemplate = (
  orderData: any,
  customerName: string,
  newStatus: string
) => {
  const statusMap: Record<string, string> = {
    pending: "Chờ xác nhận",
    processing: "Đang xử lý",
    shipping: "Đang vận chuyển",
    delivered: "Đã giao hàng",
    cancelled: "Đã hủy",
  };

  const statusVietnamese = statusMap[newStatus] || newStatus;
  const statusColor =
    newStatus === "delivered"
      ? "#28a745"
      : newStatus === "cancelled"
      ? "#dc3545"
      : newStatus === "shipping"
      ? "#007bff"
      : "#ffc107";

  return {
    subject: `Cập nhật đơn hàng #${orderData.id} - ${statusVietnamese}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Cập nhật trạng thái đơn hàng</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
          .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; color: white; font-weight: bold; }
          .content { padding: 20px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="color: #007bff; margin: 0;">Online Store</h1>
            <h2 style="margin: 10px 0;">Cập nhật đơn hàng #${orderData.id}</h2>
          </div>
          
          <div class="content">
            <p>Xin chào <strong>${customerName}</strong>,</p>
            <p>Đơn hàng #${
              orderData.id
            } của bạn đã được cập nhật trạng thái:</p>
            
            <div style="text-align: center; margin: 20px 0;">
              <span class="status-badge" style="background-color: ${statusColor};">
                ${statusVietnamese}
              </span>
            </div>
            
            ${
              newStatus === "shipping"
                ? `
              <p><strong>Thông tin vận chuyển:</strong></p>
              <p>Đơn hàng của bạn đang được giao đến địa chỉ: ${orderData.shippingStreetAddress}, ${orderData.shippingWard}, ${orderData.shippingDistrict}, ${orderData.shippingCity}</p>
              <p>Thời gian giao hàng dự kiến: 1-3 ngày làm việc</p>
            `
                : ""
            }
            
            ${
              newStatus === "delivered"
                ? `
              <p style="color: #28a745;"><strong>Đơn hàng đã được giao thành công!</strong></p>
              <p>Cảm ơn bạn đã mua sắm tại Online Store. Hy vọng bạn hài lòng với sản phẩm!</p>
            `
                : ""
            }
            
            ${
              newStatus === "cancelled"
                ? `
              <p style="color: #dc3545;"><strong>Đơn hàng đã bị hủy</strong></p>
              <p>Nếu bạn có bất kỳ thắc mắc nào, vui lòng liên hệ với chúng tôi.</p>
            `
                : ""
            }
            
            <p>Bạn có thể theo dõi chi tiết đơn hàng tại trang tài khoản của mình.</p>
            
            <p>Trân trọng,<br>Đội ngũ Online Store</p>
          </div>
          
          <div class="footer">
            <p>© 2024 Online Store. Tất cả quyền được bảo lưu.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Xin chào ${customerName},
      
      Đơn hàng #${orderData.id} của bạn đã được cập nhật trạng thái: ${statusVietnamese}
      
      Trân trọng,
      Đội ngũ Online Store
    `,
  };
};

// Email Service Functions
export const sendOrderConfirmationEmail = async (
  orderId: number
): Promise<void> => {
  try {
    // Lấy thông tin đơn hàng chi tiết
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
          ],
        },
        {
          model: Users,
          as: "user",
          attributes: ["id", "email", "username"],
        },
      ],
    });

    if (!order) {
      throw new Error(`Không tìm thấy đơn hàng với ID: ${orderId}`);
    }

    // Lấy thông tin email của khách hàng
    const user = order.getDataValue("user");
    const customerEmail = user?.email;
    const customerName =
      order.getDataValue("shippingFullName") || user?.username || "Khách hàng";

    if (!customerEmail) {
      console.log(`Không có email để gửi xác nhận cho đơn hàng #${orderId}`);
      return;
    }

    // Tạo nội dung email
    const emailTemplate = createOrderConfirmationEmailTemplate(
      order.toJSON(),
      customerName
    );

    // Gửi email
    await sendEmail({
      to: customerEmail,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
    });

    console.log(
      `Đã gửi email xác nhận đơn hàng #${orderId} đến ${customerEmail}`
    );
  } catch (error) {
    console.error(`Lỗi gửi email xác nhận đơn hàng #${orderId}:`, error);
    // Không throw error để không làm gián đoạn quá trình tạo đơn hàng
  }
};

export const sendOrderStatusUpdateEmail = async (
  orderId: number,
  newStatus: string
): Promise<void> => {
  try {
    const order = await Order.findByPk(orderId, {
      include: [
        {
          model: Users,
          as: "user",
          attributes: ["id", "email", "username"],
        },
      ],
    });

    if (!order) {
      throw new Error(`Không tìm thấy đơn hàng với ID: ${orderId}`);
    }

    const user = order.getDataValue("user");
    const customerEmail = user?.email;
    const customerName =
      order.getDataValue("shippingFullName") || user?.username || "Khách hàng";

    if (!customerEmail) {
      console.log(`Không có email để gửi cập nhật cho đơn hàng #${orderId}`);
      return;
    }

    const emailTemplate = createOrderStatusUpdateEmailTemplate(
      order.toJSON(),
      customerName,
      newStatus
    );

    await sendEmail({
      to: customerEmail,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
    });

    console.log(
      `Đã gửi email cập nhật trạng thái đơn hàng #${orderId} đến ${customerEmail}`
    );
  } catch (error) {
    console.error(
      `Lỗi gửi email cập nhật trạng thái đơn hàng #${orderId}:`,
      error
    );
  }
};
