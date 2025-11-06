import { Router } from "express";
import {
  getCurrentUser,
  getUserById,
  getAllUsers,
  updateUser,
  toggleUserStatus,
  updateUserByAdmin,
  changePassword,
} from "../controllers/User.controller";
import { authMiddleware } from "../middlewares/authMiddleware";
import {
  roleMiddleware,
  permissionMiddleware,
  Permission,
} from "../middlewares/roleMiddleware";

const router = Router();

// Lấy thông tin người dùng hiện tại
router.get("/me", authMiddleware, getCurrentUser);

// Cập nhật thông tin người dùng
router.put("/me", authMiddleware, updateUser);

// Đổi mật khẩu
router.put("/change-password", authMiddleware, changePassword);

// Lấy danh sách người dùng (admin only)
router.get("/", authMiddleware, roleMiddleware([1, 2]), getAllUsers);

// Lấy thông tin người dùng theo ID (admin only)
router.get("/:id", authMiddleware, roleMiddleware([1, 2]), getUserById);

// Cập nhật thông tin người dùng theo ID (admin only)
router.put(
  "/:id",
  authMiddleware,
  permissionMiddleware([Permission.EDIT_USERS]),
  updateUserByAdmin
);

// mở/khóa tài khoản (âdmin only)
// xài patch vì nó chỉ thay đổi một thuộc tính trong bảng user
router.patch(
  "/:id/toggle-status",
  authMiddleware,
  permissionMiddleware([Permission.TOGGLE_USER_STATUS]),
  toggleUserStatus
);

export default router;
