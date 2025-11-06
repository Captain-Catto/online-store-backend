import { Router } from "express";
import {
  createSuitability,
  getAllSuitabilities,
  updateSuitability,
  deleteSuitability,
  updateSuitabilityOrder,
} from "../controllers/Suitability.controller";
import { authMiddleware } from "../middlewares/authMiddleware";
import { roleMiddleware } from "../middlewares/roleMiddleware";

const router = Router();

// Tạo mới suitability (chỉ admin)
router.post("/", authMiddleware, roleMiddleware([1]), createSuitability);

// Lấy tất cả suitabilities
router.get("/", getAllSuitabilities);

// Cập nhật order của suitabilities
router.put(
  "/reorder",
  authMiddleware,
  roleMiddleware([1]),
  updateSuitabilityOrder
);

// Cập nhật suitability (chỉ admin)
router.put("/:id", authMiddleware, roleMiddleware([1]), updateSuitability);

// Xóa suitability (chỉ admin)
router.delete("/:id", authMiddleware, roleMiddleware([1]), deleteSuitability);

export default router;
