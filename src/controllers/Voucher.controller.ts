import { Request, Response } from "express";
import Voucher from "../models/Voucher";
import { Op } from "sequelize";

/**
 * Tạo mã giảm giá mới
 *
 * Quy trình:
 * 1. Kiểm tra mã giảm giá đã tồn tại chưa
 * 2. Tạo voucher mới với các thông tin:
 *    - Mã giảm giá (code)
 *    - Loại giảm giá (cố định hoặc phần trăm)
 *    - Giá trị giảm
 *    - Ngày hết hạn
 *    - Giá trị đơn hàng tối thiểu
 *    - Mô tả
 *    - Giới hạn sử dụng
 * 3. Trả về thông tin voucher đã tạo
 *
 * @param req - Request chứa thông tin voucher cần tạo
 * @param res - Response trả về thông tin voucher đã tạo
 */
export const createVoucher = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      code,
      type,
      value,
      expirationDate,
      minOrderValue = 0,
      description = "",
      usageLimit = 0,
      status = "active",
    } = req.body;

    // Kiểm tra nếu voucher đã tồn tại
    const existingVoucher = await Voucher.findOne({ where: { code } });
    if (existingVoucher) {
      res.status(400).json({ message: "Mã giảm giá đã tồn tại" });
      return;
    }

    const newVoucher = await Voucher.create({
      code,
      type,
      value,
      expirationDate,
      minOrderValue,
      description,
      usageLimit,
      status,
      usageCount: 0,
    });

    res.status(201).json({
      id: newVoucher.id,
      code: newVoucher.code,
      type: newVoucher.type,
      value: newVoucher.value,
      minOrderValue: newVoucher.minOrderValue,
      expirationDate: newVoucher.expirationDate,
      status: newVoucher.status,
      description: newVoucher.description,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Lấy danh sách voucher có phân trang và lọc
 *
 * Quy trình:
 * 1. Xử lý các tham số truy vấn: phân trang, tìm kiếm, lọc
 * 2. Xây dựng điều kiện truy vấn từ các tham số
 * 3. Thực hiện truy vấn với phân trang
 * 4. Trả về kết quả và metadata phân trang
 *
 * @param req - Request chứa các tham số truy vấn
 * @param res - Response trả về danh sách voucher và thông tin phân trang
 */
export const getVouchers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Step 1: Xử lý tham số truy vấn
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const status = req.query.status as string;
    const type = req.query.type as string;
    const search = req.query.search as string;
    console.log("Search query:", search);

    // Step 2: Xây dựng điều kiện truy vấn
    const where: any = {};

    // Lọc theo trạng thái
    if (status && status !== "all") {
      where.status = status;
    }

    // Lọc theo loại voucher
    if (type && type !== "all") {
      where.type = type;
    }

    // Xử lý tìm kiếm - logic mới
    if (search) {
      // Kiểm tra xem search có phải là số không
      const isNumeric = /^\d+$/.test(search);
      console.log("Is search numeric:", isNumeric);

      if (isNumeric) {
        // Nếu là số, tìm tất cả có giá trị bằng hoặc hơn số đó
        where.value = { [Op.gte]: parseInt(search) };
      } else {
        // Nếu không phải số, tìm theo mã hoặc mô tả
        where[Op.or] = [
          { code: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } },
        ];
      }
    }

    // Step 3: Đếm tổng số voucher theo điều kiện
    const count = await Voucher.count({ where });
    console.log("Total vouchers found:", count);

    // Step 4: Lấy danh sách voucher với phân trang
    const vouchers = await Voucher.findAll({
      where,
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });
    console.log("Vouchers retrieved:", vouchers.length);

    // Step 5: Trả về kết quả với thông tin phân trang
    res.status(200).json({
      vouchers,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        perPage: limit,
        hasNextPage: page < Math.ceil(count / limit),
        hasPreviousPage: page > 1,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Lấy thông tin chi tiết một mã giảm giá theo code
 *
 * Quy trình:
 * 1. Tìm voucher theo mã
 * 2. Kiểm tra các điều kiện:
 *    - Voucher tồn tại
 *    - Chưa hết hạn
 *    - Đang active
 *    - Chưa vượt quá giới hạn sử dụng
 * 3. Trả về thông tin chi tiết nếu hợp lệ
 *
 * @param req - Request chứa code của voucher
 * @param res - Response trả về thông tin chi tiết voucher
 */
export const getVoucherByCode = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { code } = req.params;
    const voucher = await Voucher.findOne({ where: { code } });

    if (!voucher) {
      res.status(404).json({ message: "Mã giảm giá không tồn tại" });
      return;
    }

    // Kiểm tra xem voucher có hết hạn không
    const currentDate = new Date();
    if (voucher.expirationDate < currentDate) {
      res.status(400).json({ message: "Mã giảm giá đã hết hạn" });
      return;
    }

    // Kiểm tra trạng thái
    if (voucher.status !== "active") {
      res.status(400).json({ message: "Mã giảm giá không khả dụng" });
      return;
    }

    // Kiểm tra giới hạn sử dụng
    if (voucher.usageLimit > 0 && voucher.usageCount >= voucher.usageLimit) {
      res.status(400).json({ message: "Mã giảm giá đã hết lượt sử dụng" });
      return;
    }

    res.status(200).json({
      id: voucher.id,
      code: voucher.code,
      type: voucher.type,
      value: voucher.value,
      minOrderValue: voucher.minOrderValue,
      expirationDate: voucher.expirationDate,
      description: voucher.description,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Cập nhật thông tin mã giảm giá
 *
 * Quy trình:
 * 1. Tìm voucher theo ID
 * 2. Kiểm tra nếu thay đổi code:
 *    - Đảm bảo code mới chưa tồn tại
 * 3. Cập nhật thông tin mới
 *
 * @param req - Request chứa ID và thông tin cần cập nhật
 * @param res - Response trả về thông tin sau khi cập nhật
 */
export const updateVoucher = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      code,
      type,
      value,
      expirationDate,
      minOrderValue,
      status,
      description,
      usageLimit,
    } = req.body;

    const voucher = await Voucher.findByPk(id);
    if (!voucher) {
      res.status(404).json({ message: "Voucher không tồn tại" });
      return;
    }

    // Kiểm tra nếu thay đổi code và code mới đã tồn tại
    if (code !== voucher.code) {
      const existingVoucher = await Voucher.findOne({ where: { code } });
      if (existingVoucher) {
        res.status(400).json({ message: "Mã giảm giá đã tồn tại" });
        return;
      }
    }

    // Cập nhật voucher
    await voucher.update({
      code,
      type,
      value,
      expirationDate,
      minOrderValue,
      status,
      description,
      usageLimit,
    });

    res.status(200).json(voucher);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Xóa một mã giảm giá
 *
 * Quy trình:
 * 1. Tìm voucher theo ID
 * 2. Xóa voucher khỏi database
 *
 * @param req - Request chứa ID voucher cần xóa
 * @param res - Response trả về kết quả xóa
 */
export const deleteVoucher = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const voucher = await Voucher.findByPk(id);
    if (!voucher) {
      res.status(404).json({ message: "Voucher không tồn tại" });
      return;
    }

    // Xóa Voucher
    await voucher.destroy();
    res.status(200).json({ message: "Xóa Voucher thành công" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Kiểm tra tính hợp lệ của mã giảm giá với giá trị đơn hàng
 *
 * Quy trình:
 * 1. Kiểm tra các điều kiện:
 *    - Voucher tồn tại
 *    - Đang active
 *    - Chưa hết hạn
 *    - Chưa vượt quá giới hạn sử dụng
 *    - Đạt giá trị đơn hàng tối thiểu
 * 2. Tính toán số tiền được giảm:
 *    - Theo phần trăm hoặc giá trị cố định
 *
 * @param req - Request chứa code voucher và giá trị đơn hàng
 * @param res - Response trả về thông tin giảm giá
 */
export const validateVoucher = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { code, orderTotal } = req.body;

    if (!code) {
      res.status(400).json({ message: "Vui lòng nhập mã giảm giá" });
      return;
    }

    const voucher = await Voucher.findOne({ where: { code } });

    // Kiểm tra các điều kiện
    if (!voucher) {
      res.status(404).json({ message: "Mã giảm giá không tồn tại" });
      return;
    }

    if (voucher.status !== "active") {
      res.status(400).json({ message: "Mã giảm giá không khả dụng" });
      return;
    }

    const currentDate = new Date();
    if (voucher.expirationDate < currentDate) {
      res.status(400).json({ message: "Mã giảm giá đã hết hạn" });
      return;
    }

    if (voucher.usageLimit > 0 && voucher.usageCount >= voucher.usageLimit) {
      res.status(400).json({ message: "Mã giảm giá đã hết lượt sử dụng" });
      return;
    }

    if (orderTotal < voucher.minOrderValue) {
      res.status(400).json({
        message: `Đơn hàng tối thiểu ${voucher.minOrderValue.toLocaleString(
          "vi-VN"
        )}đ để áp dụng mã này`,
      });
      return;
    }

    // Tính số tiền giảm giá
    let discountAmount = 0;
    if (voucher.type === "percentage") {
      discountAmount = Math.floor((orderTotal * voucher.value) / 100);
    } else {
      discountAmount = voucher.value;
    }

    res.status(200).json({
      id: voucher.id,
      code: voucher.code,
      type: voucher.type,
      value: voucher.value,
      minOrderValue: voucher.minOrderValue,
      discountAmount: discountAmount,
      description: voucher.description,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Tăng số lần sử dụng của voucher
 *
 * Quy trình:
 * 1. Tìm voucher theo ID
 * 2. Tăng biến đếm số lần sử dụng
 * 3. Cập nhật vào database
 *
 * @param req - Request chứa ID voucher
 * @param res - Response trả về số lần sử dụng mới
 */
export const incrementVoucherUsage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const voucher = await Voucher.findByPk(id);
    if (!voucher) {
      res.status(404).json({ message: "Voucher không tồn tại" });
      return;
    }

    // Tăng số lần sử dụng
    await voucher.update({
      usageCount: voucher.usageCount + 1,
    });

    res.status(200).json({
      message: "Đã cập nhật lượt sử dụng voucher",
      newCount: voucher.usageCount + 1,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Lấy danh sách mã giảm giá có thể sử dụng cho người dùng
 *
 * Quy trình:
 * 1. Kiểm tra người dùng đã đăng nhập
 * 2. Lọc voucher theo điều kiện:
 *    - Đang active
 *    - Chưa hết hạn
 *    - Còn lượt sử dụng hoặc không giới hạn
 * 3. Định dạng thông tin hiển thị
 *
 * @param req - Request chứa thông tin user từ middleware
 * @param res - Response trả về danh sách voucher khả dụng
 */
export const getUserAvailableVouchers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Lấy tất cả voucher còn hiệu lực và active
    const currentDate = new Date();
    const vouchers = await Voucher.findAll({
      where: {
        status: "active",
        expirationDate: { [Op.gt]: currentDate },
        [Op.or]: [
          { usageLimit: 0 }, // không giới hạn sử dụng
          { usageCount: { [Op.lt]: Voucher.sequelize!.col("usageLimit") } }, // số lần dùng < giới hạn
        ],
      },
      order: [["expirationDate", "ASC"]], // Sắp xếp theo ngày hết hạn gần nhất
    });

    // Chuyển đổi dữ liệu voucher sang định dạng phù hợp với client
    const formattedVouchers = vouchers.map((voucher) => ({
      id: voucher.id,
      title: formatVoucherTitle(voucher),
      expiry: new Date(voucher.expirationDate).toLocaleDateString("vi-VN"),
      code: voucher.code,
      minOrderValue: voucher.minOrderValue,
      description: voucher.description || "",
      type: voucher.type,
      value: voucher.value,
    }));

    res.status(200).json(formattedVouchers);
  } catch (error: any) {
    console.error("Error fetching user vouchers:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Định dạng tiêu đề hiển thị cho voucher
 *
 * @param voucher - Thông tin voucher cần định dạng
 * @returns Chuỗi tiêu đề đã định dạng
 */
function formatVoucherTitle(voucher: any): string {
  if (voucher.type === "percentage") {
    return `Giảm ${voucher.value}% cho đơn hàng`;
  } else {
    return `Giảm ${voucher.value.toLocaleString("vi-VN")}đ cho đơn hàng`;
  }
}
