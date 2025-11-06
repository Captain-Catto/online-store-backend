import { Request, Response } from "express";
import ProductSize from "../models/ProductSize";
import sequelize from "../config/db";
import { Op } from "sequelize";

/**
 * Lấy tất cả kích thước
 *
 * Quy trình:
 * 1. Lấy tất cả kích thước từ cơ sở dữ liệu
 * 2. Sắp xếp theo thứ tự hiển thị (displayOrder) tăng dần
 * 3. Trả về danh sách kích thước
 *
 * @param req - Request
 * @param res - Response trả về danh sách kích thước
 */
export const getAllSizes = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Bước 1: In log để theo dõi
    console.log("đang chạy getAllSizes");

    // Bước 2: Lấy tất cả kích thước và sắp xếp theo displayOrder
    const sizes = await ProductSize.findAll({
      order: [["displayOrder", "ASC"]],
    });

    // Bước 3: Trả về danh sách kích thước
    res.status(200).json(sizes);
  } catch (error: any) {
    // Bước 4: Xử lý lỗi nếu có
    res.status(500).json({ message: error.message });
  }
};

/**
 * Lấy kích thước theo danh mục
 *
 * Quy trình:
 * 1. Lấy categoryId từ query params
 * 2. Kiểm tra tính hợp lệ của categoryId
 * 3. Lấy các kích thước thuộc danh mục và đang hoạt động
 * 4. Trả về danh sách kích thước của danh mục
 *
 * @param req - Request chứa categoryId
 * @param res - Response trả về danh sách kích thước
 */
export const getSizesByCategory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Bước 1: Lấy categoryId từ query params
    const { categoryId } = req.query;

    // Bước 2a: Kiểm tra categoryId có tồn tại không
    if (!categoryId) {
      res.status(400).json({ message: "ID danh mục không được để trống" });
      return;
    }

    // Bước 2b: Chuyển đổi categoryId từ string sang number
    const categoryIdNumber = parseInt(categoryId.toString());

    // Bước 2c: Kiểm tra categoryId có phải là số hợp lệ không
    if (isNaN(categoryIdNumber)) {
      res.status(400).json({ message: "ID danh mục phải là số" });
      return;
    }

    // Bước 3: Lấy các kích thước thuộc danh mục và đang hoạt động
    const sizes = await ProductSize.findAll({
      // Lọc theo categoryId và chỉ lấy kích thước đang hoạt động
      where: {
        categoryId: categoryIdNumber,
        active: true,
      },
      // Sắp xếp theo displayOrder tăng dần
      order: [["displayOrder", "ASC"]],
    });

    // Bước 4a: Kiểm tra nếu không tìm thấy kích thước nào
    if (sizes.length === 0) {
      res
        .status(404)
        .json({ message: "Không tìm thấy kích thước cho danh mục này" });
      return;
    }

    // Bước 4b: Trả về danh sách kích thước
    res.status(200).json(sizes);
  } catch (error: any) {
    // Bước 5: Xử lý lỗi nếu có
    console.error("Lỗi khi lấy kích thước theo danh mục:", error);
    res.status(500).json({
      message: "Có lỗi xảy ra khi lấy kích thước",
      error: error.message,
    });
  }
};

/**
 * Thêm kích thước mới
 *
 * Quy trình:
 * 1. Khởi tạo transaction để đảm bảo tính toàn vẹn dữ liệu
 * 2. Lấy thông tin kích thước từ request body
 * 3. Kiểm tra xem kích thước đã tồn tại trong danh mục chưa
 * 4. Tạo kích thước mới trong cơ sở dữ liệu
 * 5. Trả về thông tin kích thước mới
 *
 * @param req - Request chứa thông tin kích thước mới
 * @param res - Response trả về kết quả tạo kích thước
 */
export const createSize = async (
  req: Request,
  res: Response
): Promise<void> => {
  // Bước 1: Khởi tạo transaction
  const t = await sequelize.transaction();
  try {
    // Bước 2: Lấy thông tin kích thước từ request body
    const { value, displayName, categoryId, displayOrder } = req.body;

    // Bước 3: Kiểm tra kích thước đã tồn tại trong cùng danh mục chưa
    const existingSize = await ProductSize.findOne({
      where: {
        value,
        categoryId: Number(categoryId),
      },
      transaction: t,
    });

    if (existingSize) {
      await t.rollback();
      res.status(400).json({
        message: `Kích thước "${value}" đã tồn tại trong danh mục này`,
      });
      return;
    }

    // Bước 4: Tạo kích thước mới
    const newSize = await ProductSize.create(
      {
        value,
        displayName: displayName || value,
        categoryId: Number(categoryId),
        displayOrder: displayOrder || 0,
        active: true,
      },
      { transaction: t }
    );

    // Bước 5: Hoàn tất transaction và trả về kết quả
    await t.commit();
    res.status(201).json(newSize);
  } catch (error: any) {
    // Bước 6: Xử lý lỗi nếu có
    await t.rollback();
    console.error("Lỗi khi tạo kích thước mới:", error);
    res.status(500).json({
      message: "Có lỗi xảy ra khi tạo kích thước mới",
      error: error.message,
    });
  }
};

/**
 * Cập nhật kích thước
 *
 * Quy trình:
 * 1. Khởi tạo transaction để đảm bảo tính toàn vẹn dữ liệu
 * 2. Lấy id kích thước từ params và thông tin cập nhật từ body
 * 3. Kiểm tra kích thước có tồn tại không
 * 4. Kiểm tra xem thông tin cập nhật có trùng với kích thước khác không
 * 5. Cập nhật thông tin kích thước
 * 6. Trả về thông tin kích thước đã cập nhật
 *
 * @param req - Request chứa id và thông tin cập nhật
 * @param res - Response trả về kết quả cập nhật
 */
export const updateSize = async (
  req: Request,
  res: Response
): Promise<void> => {
  // Bước 1: Khởi tạo transaction
  const t = await sequelize.transaction();
  try {
    // Bước 2: Lấy id và thông tin cập nhật
    const { id } = req.params;
    const { value, displayName, categoryId, displayOrder, active } = req.body; // Bước 3: Kiểm tra kích thước tồn tại
    const size = await ProductSize.findByPk(id, { transaction: t });
    if (!size) {
      await t.rollback();
      res.status(404).json({ message: "Không tìm thấy kích thước" });
      return;
    }

    // Bước 4: Kiểm tra thông tin cập nhật có trùng với kích thước khác không
    if (
      (value && value !== size.getDataValue("value")) ||
      (categoryId && categoryId !== size.getDataValue("categoryId"))
    ) {
      const existingSize = await ProductSize.findOne({
        where: {
          id: { [Op.ne]: id }, // Không phải chính nó
          value: value || size.getDataValue("value"),
          categoryId: categoryId || size.getDataValue("categoryId"),
        },
        transaction: t,
      });

      if (existingSize) {
        await t.rollback();
        res.status(400).json({
          message: `Kích thước "${
            value || size.getDataValue("value")
          }" đã tồn tại trong danh mục này`,
        });
        return;
      }
    } // Bước 5: Cập nhật thông tin kích thước
    await size.update(
      {
        value: value || size.getDataValue("value"),
        displayName: displayName || size.getDataValue("displayName"),
        categoryId: categoryId || size.getDataValue("categoryId"),
        displayOrder:
          displayOrder !== undefined
            ? displayOrder
            : size.getDataValue("displayOrder"),
        active: active !== undefined ? active : size.getDataValue("active"),
      },
      { transaction: t }
    );

    // Bước 6: Hoàn tất transaction và trả về kết quả
    await t.commit();
    res.status(200).json(size);
  } catch (error: any) {
    // Bước 7: Xử lý lỗi nếu có
    await t.rollback();
    console.error("Lỗi khi cập nhật kích thước:", error);
    res.status(500).json({
      message: "Có lỗi xảy ra khi cập nhật kích thước",
      error: error.message,
    });
  }
};

/**
 * Xóa kích thước
 *
 * Quy trình:
 * 1. Khởi tạo transaction để đảm bảo tính toàn vẹn dữ liệu
 * 2. Lấy id kích thước từ params
 * 3. Kiểm tra kích thước có tồn tại không
 * 4. Xóa kích thước
 * 5. Trả về thông báo xóa thành công
 *
 * @param req - Request chứa id kích thước cần xóa
 * @param res - Response trả về kết quả xóa
 */
export const deleteSize = async (
  req: Request,
  res: Response
): Promise<void> => {
  // Bước 1: Khởi tạo transaction
  const t = await sequelize.transaction();
  try {
    // Bước 2: Lấy id kích thước
    const { id } = req.params;

    // Bước 3: Kiểm tra kích thước tồn tại
    const size = await ProductSize.findByPk(id, { transaction: t });
    if (!size) {
      await t.rollback();
      res.status(404).json({ message: "Không tìm thấy kích thước" });
      return;
    } // Bước 4: Xóa kích thước
    // Kiểm tra xem kích thước đã được sử dụng chưa
    // Nếu đã sử dụng, chỉ vô hiệu hóa thay vì xóa
    // Code kiểm tra sản phẩm sẽ được thêm ở đây

    await size.destroy({ transaction: t });

    // Bước 5: Hoàn tất transaction và trả về kết quả
    await t.commit();
    res.status(200).json({ message: "Xóa kích thước thành công" });
  } catch (error: any) {
    // Bước 6: Xử lý lỗi nếu có
    await t.rollback();
    res.status(500).json({ message: error.message });
  }
};
