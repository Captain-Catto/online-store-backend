import { Router } from "express";
import {
  uploadProductImages,
  deleteProductImage,
  setMainImage,
} from "../controllers/ProductImage.controller";
import { upload } from "../services/imageUpload";
import { authMiddleware } from "../middlewares/authMiddleware";
import { roleMiddleware } from "../middlewares/roleMiddleware";

const router = Router();

// Upload nhiều ảnh cho một ProductDetail
router.post(
  "/:productDetailId",
  authMiddleware,
  roleMiddleware([1]),
  upload.array("images", 10),
  uploadProductImages
);

// Xóa một ảnh
router.delete("/:id", authMiddleware, roleMiddleware([1]), deleteProductImage);

// Đặt ảnh làm ảnh chính
router.put("/:id/main", authMiddleware, roleMiddleware([1]), setMainImage);

export default router;
