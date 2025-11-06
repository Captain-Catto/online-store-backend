import { Request, Response } from "express";
import ProductCategory from "../models/ProductCategory";
import Product from "../models/Product";
import Category from "../models/Category";

/**
 * Thêm danh mục vào sản phẩm
 *
 * Quy trình:
 * 1. Kiểm tra đầu vào:
 *    - Lấy productId và categoryId từ request body
 *    - Xác thực sự tồn tại của sản phẩm và danh mục
 *
 * 2. Kiểm tra trùng lặp:
 *    - Xác định xem danh mục đã được thêm vào sản phẩm chưa
 *    - Ngăn chặn việc thêm danh mục trùng lặp
 *
 * 3. Tạo liên kết:
 *    - Tạo mối quan hệ giữa sản phẩm và danh mục
 *    - Trả về kết quả thành công
 *
 * @param req - Request chứa productId và categoryId
 * @param res - Response trả về kết quả thêm danh mục
 */
export const addCategoryToProduct = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Bước 1: Lấy dữ liệu từ request body
    const { productId, categoryId } = req.body;

    // Bước 2: Kiểm tra sản phẩm và danh mục có tồn tại không
    const product = await Product.findByPk(productId);
    const category = await Category.findByPk(categoryId);

    // Bước 3: Nếu sản phẩm hoặc danh mục không tồn tại, trả về lỗi 404
    if (!product || !category) {
      res.status(404).json({ message: "Sản phẩm hoặc danh mục không tồn tại" });
      return;
    }

    // Bước 4: Kiểm tra xem danh mục đã được thêm vào sản phẩm này chưa
    const existingProductCategory = await ProductCategory.findOne({
      where: { productId, categoryId },
    });

    // Bước 5: Nếu đã có rồi thì thông báo lỗi và không thêm nữa
    if (existingProductCategory) {
      res.status(400).json({
        message: "Danh mục đã được thêm vào sản phẩm này",
      });
      return;
    }

    // Bước 6: Tạo mối quan hệ mới giữa sản phẩm và danh mục
    await ProductCategory.create({ productId, categoryId });

    // Bước 7: Trả về thông báo thành công
    res.status(201).json({
      message: "Thêm danh mục vào sản phẩm thành công",
      productId,
      categoryId,
    });
  } catch (error: any) {
    // Bước 8: Xử lý lỗi nếu có
    res.status(500).json({ message: error.message });
  }
};

/**
 * Xóa danh mục khỏi sản phẩm
 *
 * Quy trình:
 * 1. Lấy dữ liệu từ request body (productId và categoryId)
 * 2. Tìm và xóa mối quan hệ giữa sản phẩm và danh mục
 * 3. Kiểm tra kết quả xóa và trả về phản hồi thích hợp
 *
 * @param req - Request chứa productId và categoryId
 * @param res - Response trả về kết quả xóa danh mục
 */
export const removeCategoryFromProduct = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Bước 1: Lấy dữ liệu từ request body
    const { productId, categoryId } = req.body;

    // Bước 2: Xóa mối quan hệ giữa sản phẩm và danh mục
    const result = await ProductCategory.destroy({
      where: { productId, categoryId },
    });

    // Bước 3: Kiểm tra kết quả xóa, nếu không tìm thấy bản ghi nào bị xóa
    if (result === 0) {
      res.status(404).json({ message: "Không tìm thấy mối quan hệ để xóa" });
      return;
    }

    // Bước 4: Trả về thông báo xóa thành công
    res.status(200).json({ message: "Xóa danh mục khỏi sản phẩm thành công" });
  } catch (error: any) {
    // Bước 5: Xử lý lỗi nếu có
    res.status(500).json({ message: error.message });
  }
};
