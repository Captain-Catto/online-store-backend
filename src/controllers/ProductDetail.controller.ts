import { Request, Response } from "express";
import ProductDetail from "../models/ProductDetail";
import Product from "../models/Product";

/**
 * Tạo chi tiết sản phẩm
 *
 * Quy trình:
 * 1. Lấy thông tin chi tiết sản phẩm từ request body
 * 2. Chuyển đổi mảng hình ảnh thành chuỗi JSON để lưu trữ
 * 3. Kiểm tra sự tồn tại của sản phẩm
 * 4. Tạo bản ghi chi tiết sản phẩm mới
 * 5. Trả về thông tin chi tiết sản phẩm đã tạo
 *
 * @param req - Request chứa thông tin chi tiết sản phẩm
 * @param res - Response trả về kết quả tạo chi tiết sản phẩm
 */
export const createProductDetail = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Bước 1: Lấy thông tin từ request body
    const { productId, color, size, stock, images } = req.body;

    // Bước 2: Chuyển đổi mảng hình ảnh thành chuỗi JSON
    const imagePath = JSON.stringify(images); // Lưu các hình ảnh dưới dạng chuỗi JSON

    // Bước 3: Kiểm tra sản phẩm có tồn tại không
    const product = await Product.findByPk(productId);
    if (!product) {
      res.status(404).json({ message: "Sản phẩm không tồn tại" });
      return;
    }

    // Bước 4: Tạo chi tiết sản phẩm mới
    const productDetail = await ProductDetail.create({
      productId,
      color,
      size,
      stock,
      imagePath,
    });

    // Bước 5: Trả về thông tin chi tiết sản phẩm đã tạo
    res.status(201).json({
      ...productDetail.toJSON(),
      images: images,
    });
  } catch (error: any) {
    // Bước 6: Xử lý lỗi nếu có
    res.status(500).json({ message: error.message });
  }
};

/**
 * Lấy tất cả chi tiết sản phẩm
 *
 * Quy trình:
 * 1. Lấy tất cả bản ghi chi tiết sản phẩm từ cơ sở dữ liệu
 * 2. Chuyển đổi đường dẫn hình ảnh từ chuỗi JSON thành mảng
 * 3. Trả về danh sách chi tiết sản phẩm đã được định dạng
 *
 * @param req - Request
 * @param res - Response trả về danh sách chi tiết sản phẩm
 */
export const getProductDetails = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Bước 1: Lấy tất cả chi tiết sản phẩm từ database
    const productDetails = await ProductDetail.findAll();

    // Bước 2: Chuyển đổi imagePath từ chuỗi JSON thành mảng cho mỗi chi tiết sản phẩm
    const formattedProductDetails = productDetails.map((detail) => {
      let images = [];
      try {
        images = JSON.parse(detail.getDataValue("imagePath") || "[]");
      } catch (e) {
        images = [];
      }

      return {
        ...detail.toJSON(),
        images,
      };
    });

    // Bước 3: Trả về danh sách chi tiết sản phẩm đã được định dạng
    res.status(200).json(formattedProductDetails);
  } catch (error: any) {
    // Bước 4: Xử lý lỗi nếu có
    res.status(500).json({ message: error.message });
  }
};

/**
 * Lấy chi tiết sản phẩm theo id
 *
 * Quy trình:
 * 1. Lấy id từ request params
 * 2. Tìm chi tiết sản phẩm theo id
 * 3. Kiểm tra sự tồn tại của chi tiết sản phẩm
 * 4. Chuyển đổi đường dẫn hình ảnh từ chuỗi JSON thành mảng
 * 5. Trả về thông tin chi tiết sản phẩm
 *
 * @param req - Request chứa id chi tiết sản phẩm
 * @param res - Response trả về thông tin chi tiết sản phẩm
 */
export const getProductDetailById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Bước 1: Lấy id từ request params
    const { id } = req.params;

    // Bước 2: Tìm chi tiết sản phẩm theo id
    const productDetail = await ProductDetail.findByPk(id);

    // Bước 3: Kiểm tra sự tồn tại của chi tiết sản phẩm
    if (!productDetail) {
      res.status(404).json({ message: "Không tìm thấy chi tiết sản phẩm" });
      return;
    }

    // Bước 4: Chuyển đổi imagePath từ chuỗi JSON thành mảng
    let images = [];
    try {
      images = JSON.parse(productDetail.getDataValue("imagePath") || "[]");
    } catch (e) {
      images = [];
    }

    // Bước 5: Trả về thông tin chi tiết sản phẩm với images đã được parse
    res.status(200).json({
      ...productDetail.toJSON(),
      images,
    });
  } catch (error: any) {
    // Bước 6: Xử lý lỗi nếu có
    res.status(500).json({ message: error.message });
  }
};

/**
 * Lấy chi tiết sản phẩm theo id sản phẩm
 *
 * Quy trình:
 * 1. Lấy productId từ request params
 * 2. Kiểm tra tính hợp lệ của productId
 * 3. Tìm tất cả chi tiết sản phẩm theo productId
 * 4. Trả về danh sách chi tiết sản phẩm
 *
 * @param req - Request chứa id sản phẩm
 * @param res - Response trả về danh sách chi tiết sản phẩm
 */
export const getProductDetailsByProductId = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Bước 1: Lấy productId từ request params
    const { productId } = req.params;
    console.log(productId);

    // Bước 2: Kiểm tra tính hợp lệ của productId
    if (!productId) {
      res.status(400).json({ message: "Thiếu id sản phẩm" });
      return;
    }

    // Bước 3: Tìm tất cả chi tiết sản phẩm theo productId
    const productDetails = await ProductDetail.findAll({
      where: { productId },
    });

    // Bước 4: Trả về danh sách chi tiết sản phẩm
    res.status(200).json(productDetails);
  } catch (error: any) {
    // Bước 5: Xử lý lỗi nếu có
    res.status(500).json({ message: error.message });
  }
};

/**
 * Cập nhật chi tiết sản phẩm
 *
 * Quy trình:
 * 1. Lấy id và dữ liệu cập nhật từ request
 * 2. Tìm chi tiết sản phẩm theo id
 * 3. Kiểm tra sự tồn tại của chi tiết sản phẩm
 * 4. Cập nhật thông tin chi tiết sản phẩm
 * 5. Trả về thông tin chi tiết sản phẩm đã cập nhật
 *
 * @param req - Request chứa id và thông tin cập nhật
 * @param res - Response trả về kết quả cập nhật
 */
export const updateProductDetail = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Bước 1: Lấy id và dữ liệu cập nhật từ request
    const { id } = req.params;
    const { color, size, stock } = req.body;

    // Bước 2: Tìm chi tiết sản phẩm theo id
    const productDetail = await ProductDetail.findByPk(id);

    // Bước 3: Kiểm tra sự tồn tại của chi tiết sản phẩm
    if (!productDetail) {
      res.status(404).json({ message: "Không tìm thấy chi tiết sản phẩm" });
      return;
    }

    // Bước 4: Cập nhật thông tin chi tiết sản phẩm
    await productDetail.update({ color, size, stock });

    // Bước 5: Trả về thông tin chi tiết sản phẩm đã cập nhật
    res.status(200).json(productDetail);
  } catch (error: any) {
    // Bước 6: Xử lý lỗi nếu có
    res.status(500).json({ message: error.message });
  }
};

/**
 * Xóa chi tiết sản phẩm
 *
 * Quy trình:
 * 1. Lấy id từ request params
 * 2. Tìm chi tiết sản phẩm theo id
 * 3. Kiểm tra sự tồn tại của chi tiết sản phẩm
 * 4. Xóa chi tiết sản phẩm
 * 5. Trả về thông báo xóa thành công
 *
 * @param req - Request chứa id chi tiết sản phẩm cần xóa
 * @param res - Response trả về kết quả xóa
 */
export const deleteProductDetail = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Bước 1: Lấy id từ request params
    const { id } = req.params;

    // Bước 2: Tìm chi tiết sản phẩm theo id
    const productDetail = await ProductDetail.findByPk(id);

    // Bước 3: Kiểm tra sự tồn tại của chi tiết sản phẩm
    if (!productDetail) {
      res.status(404).json({ message: "Không tìm thấy chi tiết sản phẩm" });
      return;
    }

    // Bước 4: Xóa chi tiết sản phẩm
    await productDetail.destroy();

    // Bước 5: Trả về thông báo xóa thành công
    res.status(200).json({ message: "Xóa thành công" });
  } catch (error: any) {
    // Bước 6: Xử lý lỗi nếu có
    res.status(500).json({ message: error.message });
  }
};
