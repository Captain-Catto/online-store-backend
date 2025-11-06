import { Router } from "express";
import {
  addUserNote,
  getUserNotes,
  deleteUserNote,
  updateUserNote,
} from "../controllers/UserNote.controller";
import { authMiddleware } from "../middlewares/authMiddleware";
import { roleMiddleware } from "../middlewares/roleMiddleware";

const router = Router();

// Thêm ghi chú cho user
router.post(
  "/users/:id/notes",
  authMiddleware,
  roleMiddleware([1, 2]), // Chỉ admin
  addUserNote
);

// Lấy danh sách ghi chú của user
router.get(
  "/users/:id/notes",
  authMiddleware,
  roleMiddleware([1, 2]), // Chỉ admin
  getUserNotes
);

// Xóa ghi chú
router.delete(
  "/notes/:noteId",
  authMiddleware,
  roleMiddleware([1, 2]), // Chỉ admin
  deleteUserNote
);

// Cập nhật ghi chú
router.put(
  "/notes/:noteId",
  authMiddleware,
  roleMiddleware([1, 2]), // Chỉ admin
  updateUserNote
);

export default router;
