import { Router } from "express";
import {
  getUserCart,
  addItemToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  mergeCartFromCookies,
  checkStockAvailability,
} from "../controllers/Cart.controller";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();

// Kiểm tra tồn kho cho sản phẩm trong giỏ hàng
router.post("/check-stock", checkStockAvailability);

// Tất cả routes ở dưới đều yêu cầu đăng nhập
router.use(authMiddleware);

// Lấy giỏ hàng của user hiện tại
router.get("/", getUserCart);

// Thêm sản phẩm vào giỏ hàng
router.post("/items", addItemToCart);

// Cập nhật số lượng sản phẩm
router.put("/items/:id", updateCartItem);

// Xóa sản phẩm khỏi giỏ hàng
router.delete("/items/:id", removeCartItem);

// Xóa toàn bộ giỏ hàng
router.delete("/", clearCart);

// Merge giỏ hàng từ cookies vào database
router.post("/merge", mergeCartFromCookies);

export default router;
