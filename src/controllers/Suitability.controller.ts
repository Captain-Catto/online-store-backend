import { Request, Response } from "express";
import Suitability from "../models/Suitability";
import ProductSuitability from "../models/ProductSuitability";
import sequelize from "../config/db";

/**
 * Tạo mới một phù hợp sản phẩm
 *
 * Quy trình:
 * 1. Nhận thông tin phù hợp sản phẩm từ request body
 * 2. Tạo bản ghi mới trong database
 * 3. Trả về thông tin phù hợp sản phẩm đã tạo
 *
 * @param req - Request chứa thông tin phù hợp sản phẩm (name, description, slug)
 * @param res - Response trả về thông tin phù hợp sản phẩm đã tạo
 */
export const createSuitability = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Bước 1: Lấy thông tin từ request body
    const { name, description, slug } = req.body;

    // Bước 2: Tạo bản ghi mới
    const newSuitability = await Suitability.create({
      name,
      description,
      slug,
    });

    // Bước 3: Trả về kết quả
    res.status(201).json(newSuitability);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Cập nhật thứ tự sắp xếp cho danh sách phù hợp sản phẩm
 *
 * Quy trình:
 * 1. Khởi tạo transaction để đảm bảo tính toàn vẹn dữ liệu
 * 2. Kiểm tra tính hợp lệ của dữ liệu đầu vào
 * 3. Cập nhật thứ tự cho tất cả items
 * 4. Commit transaction nếu thành công hoặc rollback nếu có lỗi
 *
 * @param req - Request chứa mảng items với id và sortOrder mới
 * @param res - Response trả về kết quả cập nhật
 */
export const updateSuitabilityOrder = async (
  req: Request,
  res: Response
): Promise<void> => {
  // Bước 1: Khởi tạo transaction
  const t = await sequelize.transaction();

  try {
    // Bước 2: Kiểm tra dữ liệu đầu vào
    const { items } = req.body;

    if (!Array.isArray(items)) {
      await t.rollback();
      res.status(400).json({ message: "Items phải là một mảng" });
      return;
    }

    // Bước 3: Cập nhật thứ tự mới
    await Suitability.bulkCreate(
      items.map((item) => ({
        id: item.id,
        sortOrder: item.sortOrder,
      })),
      {
        updateOnDuplicate: ["sortOrder"],
        transaction: t,
      }
    );

    // Bước 4: Hoàn tất transaction
    await t.commit();
    res.status(200).json({ message: "Cập nhật thứ tự thành công" });
  } catch (error: any) {
    // Rollback transaction nếu có lỗi
    await t.rollback();
    console.error("Lỗi khi cập nhật thứ tự:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Lấy danh sách tất cả phù hợp sản phẩm
 *
 * Quy trình:
 * 1. Truy vấn database lấy tất cả bản ghi
 * 2. Sắp xếp theo thứ tự và id
 * 3. Trả về danh sách đã sắp xếp
 *
 * @param req - Request
 * @param res - Response trả về danh sách phù hợp sản phẩm
 */
export const getAllSuitabilities = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Bước 1 & 2: Truy vấn và sắp xếp dữ liệu
    const suitabilities = await Suitability.findAll({
      order: [
        ["sortOrder", "ASC"],
        ["id", "ASC"],
      ],
    });

    // Bước 3: Trả về kết quả
    res.status(200).json(suitabilities);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Cập nhật thông tin phù hợp sản phẩm
 *
 * Quy trình:
 * 1. Kiểm tra sự tồn tại của bản ghi
 * 2. Cập nhật thông tin mới
 * 3. Trả về thông tin đã cập nhật
 *
 * @param req - Request chứa id và thông tin cần cập nhật
 * @param res - Response trả về kết quả cập nhật
 */
export const updateSuitability = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Bước 1: Kiểm tra sự tồn tại
    const { id } = req.params;
    const { name, description, slug } = req.body;
    const suitability = await Suitability.findByPk(id);

    if (!suitability) {
      res.status(404).json({ message: "Không tìm thấy phù hợp sản phẩm" });
      return;
    }

    // Bước 2: Cập nhật thông tin
    await suitability.update({ name, description, slug });

    // Bước 3: Trả về kết quả
    res.json({ message: "Cập nhật thành công", suitability });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Xóa phù hợp sản phẩm
 *
 * Quy trình:
 * 1. Kiểm tra sự tồn tại của bản ghi
 * 2. Thực hiện xóa bản ghi
 * 3. Trả về kết quả
 *
 * @param req - Request chứa id của bản ghi cần xóa
 * @param res - Response trả về kết quả xóa
 */
export const deleteSuitability = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Bước 1: Kiểm tra sự tồn tại
    const { id } = req.params;
    const suitability = await Suitability.findByPk(id);

    if (!suitability) {
      res.status(404).json({ message: "Không tìm thấy phù hợp sản phẩm" });
      return;
    }

    // Bước 2: Xóa bản ghi
    await suitability.destroy();

    // Bước 3: Trả về kết quả
    res.json({ message: "Xóa thành công" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Thêm mối quan hệ giữa sản phẩm và phù hợp sản phẩm
 *
 * Quy trình:
 * 1. Nhận thông tin từ request body
 * 2. Tạo bản ghi liên kết mới
 * 3. Trả về kết quả
 *
 * @param req - Request chứa productId và suitabilityId
 * @param res - Response trả về kết quả thêm mối quan hệ
 */
export const addProductSuitability = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Bước 1: Lấy thông tin
    const { productId, suitabilityId } = req.body;

    // Bước 2: Tạo liên kết
    await ProductSuitability.create({ productId, suitabilityId });

    // Bước 3: Trả về kết quả
    res.status(201).json({ message: "Thêm thành công" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Xóa mối quan hệ giữa sản phẩm và phù hợp sản phẩm
 *
 * Quy trình:
 * 1. Nhận thông tin từ request params
 * 2. Xóa bản ghi liên kết
 * 3. Trả về kết quả
 *
 * @param req - Request chứa productId và suitabilityId
 * @param res - Response trả về kết quả xóa mối quan hệ
 */
export const removeProductSuitability = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Bước 1: Lấy thông tin
    const { productId, suitabilityId } = req.params;

    // Bước 2: Xóa liên kết
    await ProductSuitability.destroy({
      where: { productId, suitabilityId },
    });

    // Bước 3: Trả về kết quả
    res.json({ message: "Xóa thành công" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
