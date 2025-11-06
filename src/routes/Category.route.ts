import { Router } from "express";
import {
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getNavCategories,
  getCategoryBySlug,
  getProductsByCategorySlug,
  getAllCategories,
  getSubCategories,
  getCategoryBreadcrumb,
} from "../controllers/Category.controller";
import { authMiddleware } from "../middlewares/authMiddleware";
import { roleMiddleware } from "../middlewares/roleMiddleware";

const router = Router();

// Lấy danh sách tất cả các Category
router.get("/", getAllCategories);

// Lấy danh mục cho navigation - Thêm route mới này
router.get("/nav", getNavCategories);

// Lấy chi tiết một Category theo ID
router.get("/:id", getCategoryById);

// Lấy danh sách các Category con theo ID của Category cha
router.get("/:id/subcategories", getSubCategories);

// Thêm mới một Category (chỉ admin)
router.post("/", authMiddleware, roleMiddleware([1]), createCategory);

// Cập nhật một Category (chỉ admin)
router.put("/:id", authMiddleware, roleMiddleware([1]), updateCategory);

// Xóa một Category (chỉ admin)
router.delete("/:id", authMiddleware, roleMiddleware([1]), deleteCategory);

// Lấy breadcrumb cho một Category
router.get("/slug/:slug/breadcrumb", getCategoryBreadcrumb);

// Lấy danh mục theo slug
router.get("/slug/:slug", getCategoryBySlug);

// Lấy danh sách sản phẩm theo slug danh mục
router.get("/slug/:slug/products", getProductsByCategorySlug);

export default router;
