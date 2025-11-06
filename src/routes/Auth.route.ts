import { Router } from "express";
import {
  register,
  login,
  refreshToken,
  logout,
  forgotPassword,
  validateResetToken,
  resetPassword,
} from "../controllers/User.controller";
import { roleMiddleware } from "../middlewares/roleMiddleware";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();

// Đăng ký
router.post("/register", register);

// Đăng nhập
router.post("/login", login);

// Làm mới Access Token
router.post("/refresh-token", refreshToken);

// Đăng xuất
router.post("/logout", logout);

// api admin, check role = 1 (admin)
router.get("/admin", authMiddleware, roleMiddleware([1, 2]), (req, res) => {
  res.json({ message: "chào mừng, admin" });
});

// quên mật khẩu
router.post("/forgot-password", forgotPassword);
router.get("/reset-password/:token", validateResetToken);
router.post("/reset-password/:token", resetPassword);

export default router;
