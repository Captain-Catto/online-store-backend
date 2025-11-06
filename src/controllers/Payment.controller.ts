import { Request, Response } from "express";
import crypto from "crypto";
import qs from "qs";
import Order from "../models/Order";
import sequelize from "../config/db";
import PaymentStatus from "../models/PaymentStatus";
import { format } from "date-fns";

/**
 * Cấu hình cho cổng thanh toán VNPAY
 *
 * vnp_TmnCode: Mã website của merchant đăng ký với VNPAY
 * vnp_HashSecret: Chuỗi bí mật dùng để tạo chữ ký
 * vnp_Url: URL API của VNPAY
 * vnp_ReturnUrl: URL nhận kết quả trả về từ VNPAY
 * vnp_IpnUrl: URL nhận thông báo thanh toán tức thời từ VNPAY
 */
const vnp_TmnCode = process.env.VNP_TMN_CODE || "DEMO";
const vnp_HashSecret = process.env.VNP_HASH_SECRET || "VNPAYSECRET";
const vnp_Url =
  process.env.VNP_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
const vnp_ReturnUrl =
  process.env.VNP_RETURN_URL || "http://localhost:3000/payment/vnpay-return";
const vnp_IpnUrl =
  process.env.VNP_IPN_URL || "http://localhost:8080/api/payments/vnpay/ipn";

/**
 * Tạo URL thanh toán VNPAY
 *
 * Flow:
 * 1. Nhận thông tin đơn hàng từ request
 * 2. Chuẩn hóa dữ liệu đầu vào
 * 3. Xây dựng các tham số thanh toán cho VNPAY
 * 4. Tạo URL thanh toán với các tham số đã sắp xếp
 * 5. Tạo chữ ký bảo mật cho giao dịch
 * 6. Trả về URL thanh toán cho client
 */
export const createVNPayPaymentUrl = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    console.log("Request body:", req.body);
    // Step 1: Nhận thông tin đơn hàng từ request
    const {
      orderId,
      amount,
      orderInfo = "Thanh toan don hang",
      returnUrl,
    } = req.body;

    // Step 2: Chuẩn hóa dữ liệu - loại bỏ ký tự # từ orderInfo vì VNPAY không chấp nhận
    const sanitizedOrderInfo = orderInfo.replace(/#/g, "");

    // Step 3: Xây dựng các tham số thanh toán cho VNPAY
    const vnpParams: any = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: vnp_TmnCode,
      vnp_Locale: "vn",
      vnp_CurrCode: "VND",
      vnp_TxnRef: `${orderId}_${format(new Date(), "yyyyMMddHHmmss")}`,
      vnp_OrderInfo: sanitizedOrderInfo,
      vnp_OrderType: "other",
      vnp_Amount: Math.round(Number(amount)) * 100, // Nhân 100 vì VNPAY tính tiền theo đơn vị xu
      vnp_ReturnUrl: returnUrl || vnp_ReturnUrl,
      vnp_IpAddr: req.ip || req.socket.remoteAddress || "127.0.0.1",
      vnp_CreateDate: format(new Date(), "yyyyMMddHHmmss"),
    };

    // Step 4: Tạo URL thanh toán theo cách chuẩn của VNPAY
    const redirectUrl = new URL(vnp_Url);
    const searchParams = redirectUrl.searchParams;

    // Sắp xếp tham số theo thứ tự a-z và thêm vào URL (yêu cầu của VNPAY)
    Object.entries(vnpParams)
      .sort(([key1], [key2]) => key1.toString().localeCompare(key2.toString()))
      .forEach(([key, value]) => {
        // Bỏ qua các giá trị trống
        if (!value || value === "" || value === undefined || value === null) {
          return;
        }
        searchParams.append(key, value.toString());
      });

    // Step 5: Tạo chữ ký bảo mật dựa trên chuỗi tham số đã sắp xếp
    const hmac = crypto.createHmac("sha512", vnp_HashSecret);
    const signed = hmac
      .update(Buffer.from(redirectUrl.search.slice(1).toString(), "utf-8"))
      .digest("hex");

    // Thêm chữ ký vào URL
    searchParams.append("vnp_SecureHash", signed);

    // Lấy URL đầy đủ với tất cả tham số và chữ ký
    const paymentUrl = redirectUrl.toString();
    console.log("Payment URL:", paymentUrl);

    // Step 6: Trả về URL thanh toán cho client
    res.status(200).json({ paymentUrl });
  } catch (error: any) {
    console.error("Error creating VNPAY payment URL:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Xử lý VNPAY Payment Return
 *
 * Flow:
 * 1. Nhận các tham số trả về từ VNPAY qua query parameters
 * 2. Xác thực chữ ký của dữ liệu trả về
 * 3. Tạo lại chữ ký từ dữ liệu nhận được để so sánh
 * 4. Kiểm tra tính hợp lệ của chữ ký
 * 5. Xử lý kết quả thanh toán và cập nhật trạng thái đơn hàng
 */
export const processVNPayReturn = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Step 1: Nhận các tham số trả về từ VNPAY
    const vnpParams = req.query;
    console.log("Request query:", vnpParams);

    // Lấy chữ ký bảo mật từ dữ liệu trả về
    const secureHash = vnpParams.vnp_SecureHash as string;
    console.log("SecureHash:", secureHash);

    // Kiểm tra chữ ký có tồn tại không
    if (!secureHash) {
      res.status(400).json({
        success: false,
        message: "Missing security hash",
      });
      return;
    }

    // Step 2: Xác thực chữ ký - tạo bản sao tham số và loại bỏ các trường không cần thiết
    const params = { ...vnpParams };
    delete params.vnp_SecureHash;
    if (params.vnp_SecureHashType) {
      delete params.vnp_SecureHashType;
    }

    // Step 3: Tạo lại chữ ký từ dữ liệu nhận được
    // Tạo URL để verify
    const redirectUrl = new URL(vnp_ReturnUrl);
    const searchParams = redirectUrl.searchParams;

    // Sắp xếp và thêm tham số theo thứ tự a-z (yêu cầu của VNPAY)
    Object.entries(params)
      .sort(([key1], [key2]) => key1.toString().localeCompare(key2.toString()))
      .forEach(([key, value]) => {
        // Bỏ qua các giá trị trống
        if (!value || value === "" || value === undefined || value === null) {
          return;
        }
        searchParams.append(key, value.toString());
      });

    // Tạo chữ ký để verify
    const hmac = crypto.createHmac("sha512", vnp_HashSecret);
    const signed = hmac
      .update(Buffer.from(redirectUrl.search.slice(1).toString(), "utf-8"))
      .digest("hex");

    console.log("Generated hash:", signed);
    console.log("Received hash:", secureHash);

    // Step 4: Kiểm tra tính hợp lệ của chữ ký
    if (secureHash !== signed) {
      res.status(400).json({
        success: false,
        message: "Invalid signature",
      });
      return;
    }

    // Step 5: Xử lý kết quả thanh toán
    // Lấy mã đơn hàng từ vnp_TxnRef (đã ghép với timestamp khi tạo)
    const vnp_TxnRef = vnpParams.vnp_TxnRef as string;
    const orderId = vnp_TxnRef.split("_")[0];
    // ... tiếp tục xử lý
  } catch (error: any) {
    console.error("Error processing VNPAY return:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Xử lý VNPAY IPN (Instant Payment Notification)
 *
 * Flow:
 * 1. Nhận thông báo thanh toán tức thời từ VNPAY
 * 2. Xác thực chữ ký của dữ liệu IPN
 * 3. Tạo lại chữ ký từ dữ liệu nhận được để so sánh
 * 4. Kiểm tra tính hợp lệ của chữ ký
 * 5. Xử lý kết quả thanh toán và trả về phản hồi cho VNPAY
 */
export const processVNPayIPN = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Step 1: Nhận thông báo thanh toán từ VNPAY
    const vnpParams = req.query;
    console.log("IPN Request query:", vnpParams);

    // Lấy chữ ký bảo mật từ thông báo
    const secureHash = vnpParams.vnp_SecureHash as string;
    console.log("IPN SecureHash:", secureHash);

    // Kiểm tra chữ ký có tồn tại không
    if (!secureHash) {
      res.status(200).json({
        RspCode: "97",
        Message: "Missing secure hash",
      });
      return;
    }

    // Step 2: Xác thực chữ ký - tạo bản sao tham số và loại bỏ các trường không cần thiết
    const params = { ...vnpParams };
    delete params.vnp_SecureHash;
    if (params.vnp_SecureHashType) {
      delete params.vnp_SecureHashType;
    }

    // Step 3: Tạo lại chữ ký từ dữ liệu nhận được
    // Tạo URL để verify
    const redirectUrl = new URL(vnp_IpnUrl);
    const searchParams = redirectUrl.searchParams;

    // Sắp xếp và thêm tham số theo thứ tự a-z (yêu cầu của VNPAY)
    Object.entries(params)
      .sort(([key1], [key2]) => key1.toString().localeCompare(key2.toString()))
      .forEach(([key, value]) => {
        // Bỏ qua các giá trị trống
        if (!value || value === "" || value === undefined || value === null) {
          return;
        }
        searchParams.append(key, value.toString());
      });

    // Tạo chữ ký để verify
    const hmac = crypto.createHmac("sha512", vnp_HashSecret);
    const signed = hmac
      .update(Buffer.from(redirectUrl.search.slice(1).toString(), "utf-8"))
      .digest("hex");

    console.log("Generated hash:", signed);
    console.log("Received hash:", secureHash);

    // Step 4: Kiểm tra tính hợp lệ của chữ ký và phản hồi cho VNPAY
    if (secureHash !== signed) {
      res.status(200).json({
        RspCode: "97",
        Message: "Checksum failed",
      });
      return;
    } else {
      // Invalid signature
      res.status(200).json({
        RspCode: "97",
        Message: "Checksum failed",
      });
      return;
    }
  } catch (error: any) {
    // Step 5: Xử lý lỗi và trả về phản hồi cho VNPAY
    console.error("Error processing VNPAY IPN:", error);
    res.status(200).json({
      RspCode: "99",
      Message: "Unknown error",
    });
    return;
  }
};

/**
 * Kiểm tra trạng thái thanh toán của đơn hàng
 *
 * Flow:
 * 1. Nhận ID đơn hàng từ request params
 * 2. Truy vấn thông tin đơn hàng từ cơ sở dữ liệu
 * 3. Kiểm tra xem đơn hàng có tồn tại không
 * 4. Lấy trạng thái thanh toán của đơn hàng
 * 5. Trả về kết quả kiểm tra
 */
export const checkPaymentStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Step 1: Nhận ID đơn hàng từ request params
    const { orderId } = req.params;

    // Step 2: Truy vấn thông tin đơn hàng từ cơ sở dữ liệu
    const order = await Order.findByPk(orderId);

    // Step 3: Kiểm tra xem đơn hàng có tồn tại không
    if (!order) {
      res.status(404).json({ message: "Không tìm thấy đơn hàng" });
      return;
    }

    // Step 4: Lấy trạng thái thanh toán của đơn hàng
    const paymentStatusId = order.getDataValue("paymentStatusId");
    const paid = paymentStatusId === 2; // 2 = Paid (Đã thanh toán)

    // Step 5: Trả về kết quả kiểm tra
    res.status(200).json({
      paid,
      paymentStatusId,
    });
  } catch (error: any) {
    console.error("Error checking payment status:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Hàm hỗ trợ sắp xếp các thuộc tính của một đối tượng theo thứ tự a-z
 * Sử dụng cho việc tạo chữ ký khi giao tiếp với VNPAY
 *
 * @param obj Đối tượng cần sắp xếp thuộc tính
 * @returns Đối tượng mới với các thuộc tính đã được sắp xếp
 */
function sortObject(obj: any): any {
  let sorted: any = {};
  let str: string[] = [];
  let key: string;

  // Tạo mảng chứa tất cả các key của đối tượng
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      str.push(key);
    }
  }

  // Sắp xếp mảng key theo thứ tự a-z
  str.sort();

  // Tạo đối tượng mới với các key đã sắp xếp
  // Mã hóa giá trị và thay thế khoảng trắng bằng dấu +
  for (let i = 0; i < str.length; i++) {
    sorted[str[i]] = encodeURIComponent(obj[str[i]]).replace(/%20/g, "+");
  }

  return sorted;
}
