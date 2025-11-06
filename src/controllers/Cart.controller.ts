import { Request, Response } from "express";
import Cart from "../models/Cart";
import CartItem from "../models/CartItem";
import Product from "../models/Product";
import ProductDetail from "../models/ProductDetail";
import ProductImage from "../models/ProductImage";
import ProductInventory from "../models/ProductInventory";

/**
 * Lấy giỏ hàng của người dùng đăng nhập
 * Flow:
 * Step 1: Validate user authentication
 * Step 2: Find or create cart for user
 * Step 3: Get all cart items with product details and images
 * Step 4: Format cart data for response
 * Step 5: Calculate totals and return formatted response
 */
export const getUserCart = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Step 1: Lấy userId từ token đã authenticate
    const userId = req.user?.id;

    // Kiểm tra user đã đăng nhập hay chưa
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Step 2: Tìm giỏ hàng của user, nếu chưa có thì tạo mới
    const [cart] = await Cart.findOrCreate({
      where: { userId },
      defaults: { userId },
    });

    // Step 3: Lấy tất cả cart items với thông tin chi tiết sản phẩm và hình ảnh
    const cartItems = await CartItem.findAll({
      where: { cartId: cart.id },
      include: [
        {
          model: Product,
          as: "product",
          attributes: ["id", "name", "sku"], // Lấy thông tin cơ bản của sản phẩm
        },
        {
          model: ProductDetail,
          as: "productDetail",
          attributes: ["id", "price", "originalPrice"], // Lấy giá và thông tin chi tiết
          include: [
            {
              model: ProductImage,
              as: "images",
              where: { isMain: true }, // Chỉ lấy hình ảnh chính
              required: false, // Không bắt buộc phải có hình
              attributes: ["url"],
              limit: 1, // Chỉ lấy 1 hình ảnh đại diện
            },
          ],
        },
      ],
    });

    // Step 4: Format dữ liệu trả về với cấu trúc chuẩn
    const formattedItems = cartItems.map((item) => {
      const product = item.get("product") as any;
      const productDetail = item.get("productDetail") as any;
      const image = productDetail?.images?.[0]?.url || null; // Lấy URL hình ảnh hoặc null

      return {
        id: `${item.productId}-${item.color}-${item.size}`, // Tạo unique ID cho frontend
        cartItemId: item.id,
        productId: item.productId,
        productDetailId: productDetail.id,
        name: product.name,
        price: productDetail.price,
        originalPrice: productDetail.originalPrice,
        quantity: item.quantity,
        color: item.color,
        size: item.size,
        image: image,
      };
    });

    // Step 5: Tính toán tổng số lượng và tổng tiền, trả về response
    res.status(200).json({
      cartId: cart.id,
      items: formattedItems,
      totalItems: formattedItems.reduce((sum, item) => sum + item.quantity, 0), // Tổng số lượng sản phẩm
      subtotal: formattedItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      ), // Tổng tiền
    });
  } catch (error: any) {
    console.error("Error getting cart:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Thêm sản phẩm vào giỏ hàng
 * Flow:
 * Step 1: Validate user authentication
 * Step 2: Validate required fields from request body
 * Step 3: Find or create cart for user
 * Step 4: Check if product already exists in cart
 * Step 5: Update quantity if exists, create new item if not
 */
export const addItemToCart = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Step 1: Kiểm tra user đã đăng nhập chưa
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Step 2: Lấy và validate dữ liệu từ request body
    const { productId, productDetailId, quantity, color, size } = req.body;

    if (!productId || !productDetailId || !quantity || !color || !size) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }

    // Step 3: Tìm hoặc tạo giỏ hàng cho user
    const [cart] = await Cart.findOrCreate({
      where: { userId },
      defaults: { userId },
    });

    // Step 4: Kiểm tra sản phẩm (với màu và size cụ thể) đã tồn tại trong giỏ hàng chưa
    const existingItem = await CartItem.findOne({
      where: {
        cartId: cart.id,
        productId,
        color,
        size,
      },
    });

    // Step 5: Xử lý logic thêm sản phẩm
    if (existingItem) {
      // Nếu sản phẩm đã có trong giỏ hàng: cộng thêm số lượng
      existingItem.quantity += quantity;
      await existingItem.save();
      res.status(200).json({
        message: "Updated item quantity",
        item: existingItem,
      });
    } else {
      // Nếu sản phẩm chưa có trong giỏ hàng: tạo mới
      const newItem = await CartItem.create({
        cartId: cart.id,
        productId,
        productDetailId,
        quantity,
        color,
        size,
      });

      res.status(201).json({
        message: "Item added to cart",
        item: newItem,
      });
    }
  } catch (error: any) {
    console.error("Error adding to cart:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Cập nhật số lượng sản phẩm trong giỏ hàng
 * Flow:
 * Step 1: Validate user authentication and request parameters
 * Step 2: Find user's cart
 * Step 3: Find specific cart item by ID
 * Step 4: Update quantity or remove item if quantity <= 0
 * Step 5: Return success response with updated item
 */
export const updateCartItem = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Step 1: Lấy và validate dữ liệu đầu vào
    const userId = req.user?.id;
    const itemId = parseInt(req.params.id); // Lấy ID của cart item từ URL params
    const { quantity } = req.body; // Số lượng mới từ request body

    // Kiểm tra user đã đăng nhập chưa
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Validate dữ liệu đầu vào
    if (isNaN(itemId) || quantity === undefined) {
      res.status(400).json({ message: "Invalid request" });
      return;
    }

    // Step 2: Tìm giỏ hàng của user
    const cart = await Cart.findOne({ where: { userId } });
    if (!cart) {
      res.status(404).json({ message: "Cart not found" });
      return;
    }

    // Step 3: Tìm cart item cụ thể trong giỏ hàng của user
    const cartItem = await CartItem.findOne({
      where: { id: itemId, cartId: cart.id }, // Đảm bảo item thuộc về cart của user này
    });

    if (!cartItem) {
      res.status(404).json({ message: "Item not found in cart" });
      return;
    }

    // Step 4: Xử lý logic cập nhật dựa trên số lượng
    if (quantity <= 0) {
      // Nếu số lượng <= 0: xóa item khỏi giỏ hàng
      await cartItem.destroy();
      res.status(200).json({ message: "Item removed from cart" });
    } else {
      // Step 5: Cập nhật số lượng mới và lưu vào database
      cartItem.quantity = quantity;
      await cartItem.save();
      res
        .status(200)
        .json({ message: "Item quantity updated", item: cartItem });
    }
  } catch (error: any) {
    console.error("Error updating cart item:", error);
    res.status(500).json({ message: error.message });
  }
};

// Xóa sản phẩm khỏi giỏ hàng
/**
 * Xóa sản phẩm khỏi giỏ hàng
 * Flow:
 * Step 1: Validate user authentication và request parameters
 * Step 2: Tìm giỏ hàng của user
 * Step 3: Tìm cart item cần xóa theo ID
 * Step 4: Xóa item khỏi giỏ hàng
 * Step 5: Trả về thông báo thành công
 */
export const removeCartItem = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Step 1: Lấy và validate dữ liệu đầu vào
    const userId = req.user?.id;
    const itemId = parseInt(req.params.id);

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Step 2: Tìm cart của user
    const cart = await Cart.findOne({ where: { userId } });
    if (!cart) {
      res.status(404).json({ message: "Cart not found" });
      return;
    }

    // Step 3: Tìm và xóa cartItem
    const cartItem = await CartItem.findOne({
      where: { id: itemId, cartId: cart.id },
    });

    if (!cartItem) {
      res.status(404).json({ message: "Item not found in cart" });
      return;
    }

    // Step 4: Xóa item khỏi database
    await cartItem.destroy();

    // Step 5: Trả về thông báo thành công
    res.status(200).json({ message: "Item removed from cart" });
  } catch (error: any) {
    console.error("Error removing cart item:", error);
    res.status(500).json({ message: error.message });
  }
};

// Xóa toàn bộ giỏ hàng
/**
 * Xóa toàn bộ giỏ hàng của người dùng
 * Flow:
 * Step 1: Kiểm tra xác thực người dùng
 * Step 2: Tìm giỏ hàng của người dùng
 * Step 3: Xóa tất cả sản phẩm trong giỏ hàng
 * Step 4: Trả về thông báo thành công
 */
export const clearCart = async (req: Request, res: Response): Promise<void> => {
  try {
    // Step 1: Kiểm tra xác thực người dùng
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Step 2: Tìm giỏ hàng của người dùng
    const cart = await Cart.findOne({ where: { userId } });
    if (!cart) {
      res.status(404).json({ message: "Cart not found" });
      return;
    }

    // Step 3: Xóa tất cả sản phẩm trong giỏ hàng
    await CartItem.destroy({ where: { cartId: cart.id } });

    // Step 4: Trả về thông báo thành công
    res.status(200).json({ message: "Cart cleared" });
  } catch (error: any) {
    console.error("Error clearing cart:", error);
    res.status(500).json({ message: error.message });
  }
};

// Merge giỏ hàng từ cookies vào database (cho trường hợp user vừa đăng nhập)
/**
 * Gộp giỏ hàng từ cookies (local storage) vào database sau khi người dùng đăng nhập
 * Flow:
 * Step 1: Kiểm tra và xác thực dữ liệu đầu vào
 * Step 2: Tìm hoặc tạo giỏ hàng cho người dùng trong database
 * Step 3: Duyệt qua từng sản phẩm trong giỏ hàng cookies
 * Step 4: Tìm thông tin chi tiết sản phẩm
 * Step 5: Kiểm tra sản phẩm đã tồn tại trong giỏ hàng database chưa
 * Step 6: Cập nhật số lượng nếu đã tồn tại hoặc thêm mới nếu chưa
 * Step 7: Lấy lại thông tin giỏ hàng đã cập nhật và trả về
 */
export const mergeCartFromCookies = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Step 1: Kiểm tra và xác thực dữ liệu đầu vào
    const userId = req.user?.id;
    const { cartItems } = req.body;

    if (!userId || !cartItems || !Array.isArray(cartItems)) {
      res.status(400).json({ message: "Invalid request" });
      return;
    }

    // Step 2: Tìm hoặc tạo giỏ hàng cho người dùng trong database
    const [cart] = await Cart.findOrCreate({
      where: { userId },
      defaults: { userId },
    });

    // Step 3: Duyệt qua từng sản phẩm trong giỏ hàng cookies
    for (const item of cartItems) {
      const { productId, color, size, quantity } = item;

      // Step 4: Tìm thông tin chi tiết sản phẩm
      const productDetail = await ProductDetail.findOne({
        where: { productId, color },
      });

      if (!productDetail) continue;

      // Step 5: Kiểm tra sản phẩm đã tồn tại trong giỏ hàng database chưa
      const existingItem = await CartItem.findOne({
        where: {
          cartId: cart.id,
          productId,
          color,
          size,
        },
      });

      // Step 6: Cập nhật số lượng nếu đã tồn tại hoặc thêm mới nếu chưa
      if (existingItem) {
        // Cập nhật số lượng
        existingItem.quantity += quantity;
        await existingItem.save();
      } else {
        // Thêm mới
        await CartItem.create({
          cartId: cart.id,
          productId,
          productDetailId: productDetail.id,
          quantity,
          color,
          size,
        });
      }
    }

    // Step 7: Lấy lại thông tin giỏ hàng đã cập nhật và trả về
    const updatedCartItems = await CartItem.findAll({
      where: { cartId: cart.id },
      include: [
        {
          model: Product,
          as: "product",
          attributes: ["id", "name", "sku"],
        },
        {
          model: ProductDetail,
          as: "productDetail",
          attributes: ["id", "price", "originalPrice"],
          include: [
            {
              model: ProductImage,
              as: "images",
              where: { isMain: true },
              required: false,
              attributes: ["url"],
              limit: 1,
            },
          ],
        },
      ],
    });

    res.status(200).json({
      message: "Cart merged successfully",
      cartId: cart.id,
      itemCount: updatedCartItems.length,
    });
  } catch (error: any) {
    console.error("Error merging cart:", error);
    res.status(500).json({ message: error.message });
  }
};

// Kiểm tra tồn kho sản phẩm trong giỏ hàng
/**
 * Kiểm tra số lượng tồn kho của các sản phẩm trong giỏ hàng
 * Flow:
 * Step 1: Kiểm tra và xác thực dữ liệu đầu vào
 * Step 2: Duyệt qua từng sản phẩm cần kiểm tra
 * Step 3: Lấy thông tin chi tiết sản phẩm
 * Step 4: Lấy thông tin tồn kho của sản phẩm theo size
 * Step 5: Kiểm tra số lượng tồn kho so với số lượng yêu cầu
 * Step 6: Thêm vào danh sách sản phẩm không hợp lệ nếu không đủ số lượng
 * Step 7: Trả về kết quả kiểm tra
 *
 * Lưu ý: Người dùng không cần đăng nhập vẫn có thể kiểm tra tồn kho
 */
export const checkStockAvailability = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Step 1: Kiểm tra và xác thực dữ liệu đầu vào
    const { items } = req.body;

    if (!items || !Array.isArray(items)) {
      res.status(400).json({ message: "Invalid items data" });
      return;
    }

    const invalidItems = [];

    // Step 2: Duyệt qua từng sản phẩm cần kiểm tra
    for (const item of items) {
      const { productDetailId, size, quantity } = item;

      // Kiểm tra dữ liệu đầu vào
      if (!productDetailId || !size || !quantity) {
        continue; // Bỏ qua item không hợp lệ
      }

      // Step 3: Lấy thông tin chi tiết sản phẩm
      const productDetail = await ProductDetail.findByPk(productDetailId, {
        include: [
          {
            model: Product,
            as: "product",
            attributes: ["id", "name"],
          },
        ],
      });

      if (!productDetail) {
        invalidItems.push({
          id: productDetailId,
          name: "Sản phẩm không xác định",
          available: 0,
          requested: quantity,
        });
        continue;
      }

      // Step 4: Lấy thông tin tồn kho
      const inventory = await ProductInventory.findOne({
        where: {
          productDetailId,
          size,
        },
      });

      // Nếu không tìm thấy thông tin tồn kho
      if (!inventory) {
        invalidItems.push({
          id: productDetailId,
          name: productDetail.getDataValue("product").name,
          color: productDetail.getDataValue("color"),
          size: size,
          available: 0,
          requested: quantity,
          message: `Size ${size} cho sản phẩm không tồn tại`,
        });
        continue;
      }

      // Step 5: Kiểm tra số lượng tồn kho so với số lượng yêu cầu
      const availableStock = inventory.getDataValue("stock");

      if (availableStock === 0) {
        // Step 6: Thêm vào danh sách sản phẩm không hợp lệ nếu hết hàng
        invalidItems.push({
          id: productDetailId,
          name: productDetail.getDataValue("product").name,
          color: productDetail.getDataValue("color"),
          size: size,
          available: 0,
          requested: quantity,
          message: `Sản phẩm đã hết hàng`,
        });
        continue;
      }

      // Kiểm tra nếu số lượng tồn kho ít hơn số lượng yêu cầu
      if (availableStock < quantity) {
        invalidItems.push({
          id: productDetailId,
          name: productDetail.getDataValue("product").name,
          color: productDetail.getDataValue("color"),
          size: size,
          available: availableStock,
          requested: quantity,
          message: `Chỉ còn ${availableStock} sản phẩm có sẵn`,
        });
      }
    }

    // Step 7: Trả về kết quả kiểm tra
    res.status(200).json({
      valid: invalidItems.length === 0,
      invalidItems,
    });
  } catch (error: any) {
    console.error("Error checking stock availability:", error);
    res.status(500).json({
      message: "Server error khi kiểm tra tồn kho",
      error: error.message,
    });
  }
};
