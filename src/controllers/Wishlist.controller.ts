import { Request, Response } from "express";
import Wishlist from "../models/Wishlist";
import Product from "../models/Product";
import ProductDetail from "../models/ProductDetail";
import ProductImage from "../models/ProductImage";
import ProductInventory from "../models/ProductInventory";
import ProductCategory from "../models/ProductCategory";
import Category from "../models/Category";

/**
 * Lấy danh sách yêu thích của người dùng đang đăng nhập (có phân trang)
 *
 * Flow:
 * 1. Kiểm tra xác thực người dùng
 * 2. Xử lý tham số phân trang từ request
 * 3. Đếm tổng số mục trong danh sách yêu thích
 * 4. Truy vấn danh sách yêu thích với đầy đủ thông tin sản phẩm liên quan
 * 5. Tính toán metadata phân trang
 * 6. Trả về kết quả kèm theo thông tin phân trang
 * 7. Xử lý lỗi nếu có
 */
export const getUserWishlist = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Bước 1: Kiểm tra xác thực người dùng
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Bước 2: Xử lý tham số phân trang từ request
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    // Bước 3: Đếm tổng số mục trong danh sách yêu thích
    const totalItems = await Wishlist.count({
      where: { userId: req.user.id },
    });

    // Bước 4: Truy vấn danh sách yêu thích với đầy đủ thông tin sản phẩm liên quan
    const wishlistItems = await Wishlist.findAll({
      where: { userId: req.user.id },
      include: [
        {
          model: Product,
          as: "product",
          attributes: [
            "id",
            "name",
            "sku",
            "description",
            "brand",
            "material",
            "featured",
            "status",
          ],
          include: [
            {
              model: ProductDetail,
              as: "details",
              attributes: ["id", "color", "price", "originalPrice"],
              include: [
                {
                  model: ProductImage,
                  as: "images",
                  attributes: ["id", "url", "isMain"],
                },
                {
                  model: ProductInventory,
                  as: "inventories",
                  attributes: ["id", "size", "stock"],
                },
              ],
            },
            {
              model: Category,
              as: "categories",
              through: { attributes: [] },
              attributes: ["id", "name", "slug"],
            },
          ],
        },
      ],
      limit,
      offset,
      order: [["createdAt", "DESC"]], // Sắp xếp theo thời gian tạo mới nhất
    });

    // Bước 5: Tính toán metadata phân trang
    const totalPages = Math.ceil(totalItems / limit);

    // Bước 6: Trả về kết quả kèm theo thông tin phân trang
    res.status(200).json({
      items: wishlistItems,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error: any) {
    // Bước 7: Xử lý lỗi nếu có
    console.error("Error fetching wishlist:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Thêm sản phẩm vào danh sách yêu thích
 *
 * Flow:
 * 1. Kiểm tra xác thực người dùng
 * 2. Lấy productId từ request body
 * 3. Kiểm tra tính hợp lệ của productId
 * 4. Kiểm tra sự tồn tại của sản phẩm trong database
 * 5. Kiểm tra xem sản phẩm đã có trong danh sách yêu thích chưa
 * 6. Thêm sản phẩm vào danh sách yêu thích
 * 7. Trả về kết quả thành công
 * 8. Xử lý lỗi nếu có
 */
export const addToWishlist = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Bước 1: Kiểm tra xác thực người dùng
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Bước 2: Lấy productId từ request body
    const { productId } = req.body;

    // Bước 3: Kiểm tra tính hợp lệ của productId
    if (!productId) {
      res.status(400).json({ message: "Product ID is required" });
      return;
    }

    // Bước 4: Kiểm tra sự tồn tại của sản phẩm trong database
    const productExists = await Product.findByPk(productId);
    if (!productExists) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    // Bước 5: Kiểm tra xem sản phẩm đã có trong danh sách yêu thích chưa
    const existingItem = await Wishlist.findOne({
      where: {
        userId: req.user.id,
        productId,
      },
    });

    if (existingItem) {
      res.status(400).json({ message: "Product already in wishlist" });
      return;
    }

    // Bước 6: Thêm sản phẩm vào danh sách yêu thích
    const wishlistItem = await Wishlist.create({
      userId: req.user.id,
      productId,
    });

    // Bước 7: Trả về kết quả thành công
    res.status(201).json({
      message: "Product added to wishlist successfully",
      data: wishlistItem,
    });
  } catch (error: any) {
    // Bước 8: Xử lý lỗi nếu có
    res.status(500).json({ message: error.message });
  }
};

/**
 * Xóa sản phẩm khỏi danh sách yêu thích
 *
 * Flow:
 * 1. Kiểm tra xác thực người dùng
 * 2. Lấy productId từ request params
 * 3. Tìm và xóa mục yêu thích từ database
 * 4. Kiểm tra kết quả xóa và trả về phản hồi phù hợp
 * 5. Xử lý lỗi nếu có
 */
export const removeFromWishlist = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Bước 1: Kiểm tra xác thực người dùng
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Bước 2: Lấy productId từ request params
    const { productId } = req.params;

    // Bước 3: Tìm và xóa mục yêu thích từ database
    const deleted = await Wishlist.destroy({
      where: {
        userId: req.user.id,
        productId,
      },
    });

    // Bước 4: Kiểm tra kết quả xóa và trả về phản hồi phù hợp
    if (deleted === 0) {
      res.status(404).json({ message: "Item not found in wishlist" });
      return;
    }

    res
      .status(200)
      .json({ message: "Item removed from wishlist successfully" });
  } catch (error: any) {
    // Bước 5: Xử lý lỗi nếu có
    res.status(500).json({ message: error.message });
  }
};

/**
 * Kiểm tra xem sản phẩm có trong danh sách yêu thích không
 *
 * Flow:
 * 1. Kiểm tra xác thực người dùng
 * 2. Lấy productId từ request params
 * 3. Tìm kiếm sản phẩm trong danh sách yêu thích của người dùng
 * 4. Trả về kết quả kiểm tra (true/false)
 * 5. Xử lý lỗi nếu có
 */
export const checkWishlistItem = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Bước 1: Kiểm tra xác thực người dùng
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Bước 2: Lấy productId từ request params
    const { productId } = req.params;

    // Bước 3: Tìm kiếm sản phẩm trong danh sách yêu thích của người dùng
    const item = await Wishlist.findOne({
      where: {
        userId: req.user.id,
        productId,
      },
    });

    // Bước 4: Trả về kết quả kiểm tra (true/false)
    res.status(200).json({
      inWishlist: !!item,
    });
  } catch (error: any) {
    // Bước 5: Xử lý lỗi nếu có
    res.status(500).json({ message: error.message });
  }
};
