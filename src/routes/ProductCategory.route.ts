import { Router } from "express";
import {
  addCategoryToProduct,
  removeCategoryFromProduct,
} from "../controllers/ProductCategory.controller";

const router = Router();

// Thêm danh mục vào sản phẩm
router.post("/", addCategoryToProduct);

// Xóa danh mục khỏi sản phẩm
router.delete("/", removeCategoryFromProduct);

export default router;
