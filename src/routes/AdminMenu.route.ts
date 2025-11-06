// filepath: d:\desktop\hoc\khoa-iron-hack\J2345\project\online-store\online-store-backend\src\routes\AdminMenuItem.route.ts
import express from "express";
import {
  getAdminMenu, // Dùng cho sidebar
  getAllAdminMenuItemsFlat, // Dùng cho trang quản lý
  createAdminMenuItem,
  updateAdminMenuItem,
  deleteAdminMenuItem,
  updateMenuOrder,
} from "../controllers/AdminMenuItem.controller";
import { authMiddleware } from "../middlewares/authMiddleware";
import { roleMiddleware } from "../middlewares/roleMiddleware";

const router = express.Router();

// Route để lấy menu cho sidebar (dùng cho tất cả các user)
router.get("/", authMiddleware, getAdminMenu);

// Routes cho trang quản lý CRUD
router.get(
  "/manage", // Route riêng để lấy danh sách phẳng
  authMiddleware,
  roleMiddleware([1]), // Chỉ admin mới được quản lý
  getAllAdminMenuItemsFlat
);
router.post(
  "/manage",
  authMiddleware,
  roleMiddleware([1]),
  createAdminMenuItem
);
router.put(
  "/manage/order",
  authMiddleware,
  roleMiddleware([1]),
  updateMenuOrder
);
router.put(
  "/manage/:id",
  authMiddleware,
  roleMiddleware([1]),
  updateAdminMenuItem
);
router.delete(
  "/manage/:id",
  authMiddleware,
  roleMiddleware([1]),
  deleteAdminMenuItem
);

export default router;
