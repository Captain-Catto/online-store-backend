import { Router } from "express";
import {
  createProductDetail,
  getProductDetails,
  getProductDetailById,
  updateProductDetail,
  deleteProductDetail,
  getProductDetailsByProductId,
} from "../controllers/ProductDetail.controller";
import { authMiddleware } from "../middlewares/authMiddleware";
import { roleMiddleware } from "../middlewares/roleMiddleware";

const router = Router();

// Tạo chi tiết sản phẩm (chỉ admin)
router.post("/", authMiddleware, roleMiddleware([1]), createProductDetail);

// Lấy danh sách chi tiết sản phẩm
router.get("/", getProductDetails);

// Lấy chi tiết sản phẩm theo ID
router.get("/:id", getProductDetailById);

// lấy chi tiết sản phẩm theo ID sản phẩm
router.get("/product/:productId", getProductDetailsByProductId);

// Cập nhật chi tiết sản phẩm (chỉ admin)
router.put("/:id", authMiddleware, roleMiddleware([1]), updateProductDetail);

// Xóa chi tiết sản phẩm (chỉ admin)
router.delete("/:id", authMiddleware, roleMiddleware([1]), deleteProductDetail);

export default router;
