import { Request, Response } from "express";
import UserNote from "../models/UserNotes";
import Users from "../models/Users";

/**
 * Thêm ghi chú mới cho user
 *
 * Flow:
 * 1. Lấy userId từ request params và nội dung ghi chú từ request body
 * 2. Kiểm tra tính hợp lệ của nội dung ghi chú (không được trống)
 * 3. Kiểm tra sự tồn tại của người dùng trong database
 * 4. Tạo ghi chú mới trong database
 * 5. Trả về thông báo thành công và thông tin ghi chú
 * 6. Xử lý lỗi nếu có
 */
export const addUserNote = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Bước 1: Lấy userId từ request params và nội dung ghi chú từ request body
    const { id } = req.params;
    const { note } = req.body;

    // Bước 2: Kiểm tra tính hợp lệ của nội dung ghi chú
    if (!note) {
      res.status(400).json({ message: "Nội dung ghi chú không được để trống" });
      return;
    }

    // Bước 3: Kiểm tra sự tồn tại của người dùng trong database
    const user = await Users.findByPk(id);
    if (!user) {
      res.status(404).json({ message: "Người dùng không tồn tại" });
      return;
    }

    // Bước 4: Tạo ghi chú mới trong database
    const userNote = await UserNote.create({
      userId: Number(id),
      note,
    });

    // Bước 5: Trả về thông báo thành công và thông tin ghi chú
    res.status(201).json({
      message: "Thêm ghi chú thành công",
      note: userNote,
    });
  } catch (error: any) {
    // Bước 6: Xử lý lỗi nếu có
    console.error("Error adding user note:", error);
    res.status(500).json({
      message: "Lỗi khi thêm ghi chú",
      error: error.message,
    });
  }
};

/**
 * Lấy danh sách ghi chú của user
 *
 * Flow:
 * 1. Lấy userId từ request params
 * 2. Kiểm tra sự tồn tại của người dùng trong database
 * 3. Truy vấn tất cả ghi chú của người dùng từ database
 * 4. Trả về danh sách ghi chú cùng với thông tin người dùng
 * 5. Xử lý lỗi nếu có
 */
export const getUserNotes = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Bước 1: Lấy userId từ request params
    const { id } = req.params; // userId

    // Bước 2: Kiểm tra sự tồn tại của người dùng trong database
    const user = await Users.findByPk(id);
    if (!user) {
      res.status(404).json({ message: "Người dùng không tồn tại" });
      return;
    }

    // Bước 3: Truy vấn tất cả ghi chú của người dùng từ database
    const notes = await UserNote.findAll({
      where: { userId: id },
      order: [["createdAt", "DESC"]], // Sắp xếp theo thời gian tạo mới nhất
    });

    // Bước 4: Trả về danh sách ghi chú cùng với thông tin người dùng
    res.status(200).json({
      userId: id,
      username: user.username,
      notes,
    });
  } catch (error: any) {
    // Bước 5: Xử lý lỗi nếu có
    console.error("Error fetching user notes:", error);
    res.status(500).json({
      message: "Lỗi khi lấy danh sách ghi chú",
      error: error.message,
    });
  }
};

/**
 * Xóa ghi chú
 *
 * Flow:
 * 1. Lấy noteId từ request params
 * 2. Tìm kiếm ghi chú trong database
 * 3. Kiểm tra sự tồn tại của ghi chú
 * 4. Xóa ghi chú khỏi database
 * 5. Trả về thông báo xóa thành công
 * 6. Xử lý lỗi nếu có
 */
export const deleteUserNote = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Bước 1: Lấy noteId từ request params
    const { noteId } = req.params;

    // Bước 2 & 3: Tìm kiếm và kiểm tra sự tồn tại của ghi chú
    const note = await UserNote.findByPk(noteId);
    if (!note) {
      res.status(404).json({ message: "Ghi chú không tồn tại" });
      return;
    }

    // Bước 4: Xóa ghi chú khỏi database
    await note.destroy();

    // Bước 5: Trả về thông báo xóa thành công
    res.status(200).json({
      message: "Xóa ghi chú thành công",
      noteId: Number(noteId),
    });
  } catch (error: any) {
    // Bước 6: Xử lý lỗi nếu có
    console.error("Error deleting user note:", error);
    res.status(500).json({
      message: "Lỗi khi xóa ghi chú",
      error: error.message,
    });
  }
};

/**
 * Cập nhật ghi chú
 *
 * Flow:
 * 1. Lấy noteId từ request params và nội dung ghi chú từ request body
 * 2. Kiểm tra tính hợp lệ của nội dung ghi chú (không được trống)
 * 3. Tìm kiếm ghi chú trong database
 * 4. Kiểm tra sự tồn tại của ghi chú
 * 5. Cập nhật nội dung ghi chú trong database
 * 6. Trả về thông báo cập nhật thành công và thông tin ghi chú đã cập nhật
 * 7. Xử lý lỗi nếu có
 */
export const updateUserNote = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Bước 1: Lấy noteId từ request params và nội dung ghi chú từ request body
    const { noteId } = req.params;
    const { note } = req.body;

    // Bước 2: Kiểm tra tính hợp lệ của nội dung ghi chú
    if (!note) {
      res.status(400).json({ message: "Nội dung ghi chú không được để trống" });
      return;
    }

    // Bước 3 & 4: Tìm kiếm và kiểm tra sự tồn tại của ghi chú
    const existingNote = await UserNote.findByPk(noteId);
    if (!existingNote) {
      res.status(404).json({ message: "Ghi chú không tồn tại" });
      return;
    }

    // Bước 5: Cập nhật nội dung ghi chú trong database
    await existingNote.update({ note });

    // Bước 6: Trả về thông báo cập nhật thành công và thông tin ghi chú đã cập nhật
    res.status(200).json({
      message: "Cập nhật ghi chú thành công",
      note: existingNote,
    });
  } catch (error: any) {
    // Bước 7: Xử lý lỗi nếu có
    console.error("Error updating user note:", error);
    res.status(500).json({
      message: "Lỗi khi cập nhật ghi chú",
      error: error.message,
    });
  }
};
