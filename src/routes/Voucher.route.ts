import { Router } from "express";
import {
  createVoucher,
  getVouchers,
  getVoucherByCode,
  updateVoucher,
  deleteVoucher,
  validateVoucher,
  incrementVoucherUsage,
  getUserAvailableVouchers,
} from "../controllers/Voucher.controller";
import { authMiddleware } from "../middlewares/authMiddleware";
import { roleMiddleware } from "../middlewares/roleMiddleware";

const router = Router();

// Lấy danh sách tất cả các Voucher (admin)
router.get("/", authMiddleware, roleMiddleware([1]), getVouchers);

// Lấy danh sách voucher có sẵn cho người dùng đã đăng nhập
router.get("/user/available", authMiddleware, getUserAvailableVouchers);

// Lấy chi tiết một Voucher theo mã code
router.get("/:code", getVoucherByCode);

// Kiểm tra và áp dụng voucher
router.post("/validate", validateVoucher);

// Tăng lượt sử dụng voucher
router.post("/:id/increment-usage", incrementVoucherUsage);

// Thêm mới một Voucher (chỉ admin)
router.post("/", authMiddleware, roleMiddleware([1]), createVoucher);

// Cập nhật một Voucher (chỉ admin)
router.put("/:id", authMiddleware, roleMiddleware([1]), updateVoucher);

// Xóa một Voucher (chỉ admin)
router.delete("/:id", authMiddleware, roleMiddleware([1]), deleteVoucher);

export default router;
