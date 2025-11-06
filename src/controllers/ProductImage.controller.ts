import { Request, Response } from "express";
import ProductImage from "../models/ProductImage";
import ProductDetail from "../models/ProductDetail";
import { deleteFile } from "../services/imageUpload";

/**
 * Upload ảnh cho một ProductDetail
 *
 * Quy trình:
 * 1. Lấy productDetailId từ params và thông tin ảnh từ request
 * 2. Kiểm tra ProductDetail có tồn tại không
 * 3. Nếu đánh dấu là ảnh chính, reset tất cả ảnh khác
 * 4. Xác định thứ tự hiển thị cho ảnh mới
 * 5. Lưu thông tin các ảnh đã upload vào cơ sở dữ liệu
 * 6. Trả về thông tin các ảnh đã lưu
 *
 * @param req - Request chứa thông tin ảnh và productDetailId
 * @param res - Response trả về kết quả upload ảnh
 */
export const uploadProductImages = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Bước 1: Lấy productDetailId từ params của request
    const { productDetailId } = req.params;
    // Đây là kiểu của multer-s3 v3
    const files = req.files as Express.Multer.File[] & { location?: string }[];
    // Lấy thông tin isMain từ body của request
    const { isMain } = req.body;

    // Bước 2: Kiểm tra ProductDetail có tồn tại không
    const productDetail = await ProductDetail.findByPk(productDetailId);
    if (!productDetail) {
      res.status(404).json({ message: "Chi tiết sản phẩm không tồn tại" });
      return;
    }

    // Bước 3: Nếu đánh dấu là hình ảnh chính, reset tất cả các hình ảnh khác
    if (isMain) {
      await ProductImage.update(
        { isMain: false },
        { where: { productDetailId } }
      );
    }

    // Bước 4: Xác định displayOrder cho các hình ảnh mới
    const lastImage = await ProductImage.findOne({
      where: { productDetailId },
      order: [["displayOrder", "DESC"]],
    });

    // Lấy thứ tự hiển thị cho ảnh mới (tiếp theo sau ảnh cuối cùng hoặc bắt đầu từ 0)
    const startOrder = lastImage
      ? lastImage.getDataValue("displayOrder") + 1
      : 0;

    // Bước 5: Lưu thông tin các file đã upload
    const savedImages = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i] as any; // Vì multer-s3 thêm trường không có trong Express.Multer.File

      // URL của ảnh trên S3
      const url = file.location; // multer-s3 tự động cung cấp location

      console.log("File uploaded to S3:", {
        name: file.originalname,
        size: file.size,
        location: url,
      });

      // Tạo bản ghi mới trong bảng ProductImage
      const image = await ProductImage.create({
        productDetailId,
        url,
        isMain: isMain && i === 0, // Chỉ file đầu tiên là main nếu có yêu cầu
        displayOrder: startOrder + i,
      });

      // Thêm thông tin ảnh đã lưu vào mảng kết quả
      savedImages.push({
        id: image.id,
        url: image.getDataValue("url"),
        isMain: image.getDataValue("isMain"),
        displayOrder: image.getDataValue("displayOrder"),
      });
    }

    // Bước 6: Trả về thông báo thành công và danh sách ảnh đã lưu
    res.status(201).json({
      message: "Upload ảnh thành công",
      images: savedImages,
    });
  } catch (error: any) {
    // Bước 7: Xử lý lỗi nếu có
    console.error("Error in uploadProductImages:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Xóa một ảnh sản phẩm
 *
 * Quy trình:
 * 1. Lấy id của ảnh cần xóa từ params
 * 2. Tìm ảnh trong cơ sở dữ liệu
 * 3. Kiểm tra sự tồn tại của ảnh
 * 4. Lấy URL để xóa file từ S3
 * 5. Xóa bản ghi trong database
 * 6. Xóa file từ S3
 * 7. Trả về thông báo xóa thành công
 *
 * @param req - Request chứa id ảnh cần xóa
 * @param res - Response trả về kết quả xóa ảnh
 */
export const deleteProductImage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Bước 1: Lấy id của ảnh cần xóa từ params
    const { id } = req.params;

    // Bước 2: Tìm ảnh trong cơ sở dữ liệu
    const image = await ProductImage.findByPk(id);
    // Bước 3: Kiểm tra sự tồn tại của ảnh
    if (!image) {
      res.status(404).json({ message: "Không tìm thấy ảnh" });
      return;
    }

    // Bước 4: Lấy URL để xóa file từ S3
    const imageUrl = image.getDataValue("url");

    // Bước 5: Xóa record trong database
    await image.destroy(); // Bước 6: Xóa file từ S3
    await deleteFile(imageUrl);

    // Bước 7: Trả về thông báo xóa thành công
    res.status(200).json({ message: "Xóa ảnh thành công" });
  } catch (error: any) {
    // Bước 8: Xử lý lỗi nếu có
    res.status(500).json({ message: error.message });
  }
};

/**
 * Đặt một ảnh làm ảnh chính
 *
 * Quy trình:
 * 1. Lấy id của ảnh cần đặt làm ảnh chính từ params
 * 2. Tìm ảnh trong cơ sở dữ liệu
 * 3. Kiểm tra sự tồn tại của ảnh
 * 4. Lấy productDetailId từ ảnh tìm được
 * 5. Reset tất cả ảnh của productDetail này thành không phải ảnh chính
 * 6. Đặt ảnh này làm ảnh chính
 * 7. Trả về thông báo thành công và thông tin ảnh đã đặt làm ảnh chính
 *
 * @param req - Request chứa id ảnh cần đặt làm ảnh chính
 * @param res - Response trả về kết quả đặt ảnh chính
 */
export const setMainImage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Bước 1: Lấy id của ảnh cần đặt làm ảnh chính
    const { id } = req.params;

    // Bước 2: Tìm ảnh trong cơ sở dữ liệu
    const image = await ProductImage.findByPk(id);

    // Bước 3: Kiểm tra sự tồn tại của ảnh
    if (!image) {
      res.status(404).json({ message: "Không tìm thấy ảnh" });
      return;
    }

    // Bước 4: Lấy productDetailId từ ảnh tìm được
    const productDetailId = image.getDataValue("productDetailId");

    // Bước 5: Reset tất cả ảnh của productDetail này
    await ProductImage.update(
      { isMain: false },
      { where: { productDetailId } }
    );

    // Bước 6: Đặt ảnh này làm ảnh chính
    await image.update({ isMain: true });

    // Bước 7: Trả về thông báo thành công và thông tin ảnh đã được đặt làm ảnh chính
    res.status(200).json({
      message: "Đã đặt làm ảnh chính",
      image: {
        id: image.id,
        url: image.getDataValue("url"),
        isMain: true,
      },
    });
  } catch (error: any) {
    // Bước 8: Xử lý lỗi nếu có
    res.status(500).json({ message: error.message });
  }
};
