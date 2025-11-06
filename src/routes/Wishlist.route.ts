import { Router } from "express";
import {
  getUserWishlist,
  addToWishlist,
  removeFromWishlist,
  checkWishlistItem,
} from "../controllers/Wishlist.controller";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();

// Tất cả các routes đều yêu cầu đăng nhập
router.get("/", authMiddleware, getUserWishlist);
router.post("/", authMiddleware, addToWishlist);
router.delete("/:productId", authMiddleware, removeFromWishlist);
router.get("/check/:productId", authMiddleware, checkWishlistItem);

export default router;
