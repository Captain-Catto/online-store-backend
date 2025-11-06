// === IMPORT CÁC MODEL LIÊN QUAN ĐẾN SẢN PHẨM ===
import Product from "./Product";
import ProductDetail from "./ProductDetail";
import ProductInventory from "./ProductInventory";
import ProductImage from "./ProductImage";
import ProductSize from "./ProductSize";
import ProductCategory from "./ProductCategory";
import ProductSuitability from "./ProductSuitability";

// === IMPORT CÁC MODEL LIÊN QUAN ĐẾN ĐƠN HÀNG ===
import Order from "./Order";
import OrderDetail from "./OrderDetail";
import PaymentMethod from "./PaymentMethod";
import PaymentStatus from "./PaymentStatus";

// === IMPORT CÁC MODEL LIÊN QUAN ĐẾN NGƯỜI DÙNG ===
import Users from "./Users";
import UserAddress from "./UserAddress";
import UserNote from "./UserNotes";
import Role from "./Role";
import RefreshToken from "./RefreshToken";

// === IMPORT CÁC MODEL TÍNH NĂNG KHÁC ===
import Category from "./Category";
import Voucher from "./Voucher";
import NavigationMenu from "./NavigationMenu";
import Suitability from "./Suitability";
import Wishlist from "./Wishlist";
import Cart from "./Cart";
import CartItem from "./CartItem";

/**
 * Khởi tạo tất cả các mối quan hệ giữa các model trong hệ thống
 *
 * Các loại quan hệ:
 * 1. Một-Một (1-1): hasOne/belongsTo
 *    Ví dụ: Người dùng - Giỏ hàng
 *
 * 2. Một-Nhiều (1-n): hasMany/belongsTo
 *    Ví dụ: Sản phẩm - Chi tiết sản phẩm
 *
 * 3. Nhiều-Nhiều (n-n): belongsToMany
 *    Ví dụ: Sản phẩm - Danh mục (thông qua bảng ProductCategory)
 *
 * Các thuộc tính quan trọng:
 * - foreignKey: Khóa ngoại trong quan hệ
 * - as: Tên định danh để truy cập quan hệ
 * - through: Bảng trung gian cho quan hệ n-n
 * - onDelete: Hành động khi xóa ('CASCADE': xóa liên hoàn, 'SET NULL': đặt null)
 */
export default function initAssociations() {
  // === QUAN HỆ LIÊN QUAN ĐẾN SẢN PHẨM ===

  // Quan hệ Sản phẩm - Chi tiết sản phẩm (1-n)
  // Một sản phẩm có nhiều biến thể (màu sắc, kích thước...)
  Product.hasMany(ProductDetail, { foreignKey: "productId", as: "details" });
  ProductDetail.belongsTo(Product, { foreignKey: "productId", as: "product" });

  // Quan hệ Chi tiết sản phẩm - Tồn kho (1-n)
  // Mỗi biến thể sản phẩm có nhiều bản ghi tồn kho
  ProductDetail.hasMany(ProductInventory, {
    foreignKey: "productDetailId",
    as: "inventories",
  });
  ProductInventory.belongsTo(ProductDetail, {
    foreignKey: "productDetailId",
    as: "productDetail",
  });

  // Quan hệ Chi tiết sản phẩm - Hình ảnh (1-n)
  // Mỗi biến thể sản phẩm có nhiều hình ảnh
  ProductDetail.hasMany(ProductImage, {
    foreignKey: "productDetailId",
    as: "images",
  });
  ProductImage.belongsTo(ProductDetail, {
    foreignKey: "productDetailId",
    as: "productDetail",
  });

  // Quan hệ Sản phẩm - Danh mục (n-n)
  // Một sản phẩm có thể thuộc nhiều danh mục và ngược lại
  Product.belongsToMany(Category, {
    through: ProductCategory,
    foreignKey: "productId",
    otherKey: "categoryId",
    as: "categories",
  });
  Category.belongsToMany(Product, {
    through: ProductCategory,
    foreignKey: "categoryId",
    otherKey: "productId",
    as: "products",
  });

  // Quan hệ Sản phẩm - Độ phù hợp (n-n)
  // Một sản phẩm có thể phù hợp với nhiều đối tượng và ngược lại
  Product.belongsToMany(Suitability, {
    through: ProductSuitability,
    foreignKey: "productId",
    otherKey: "suitabilityId",
    as: "suitabilities",
  });
  Suitability.belongsToMany(Product, {
    through: ProductSuitability,
    foreignKey: "suitabilityId",
    otherKey: "productId",
    as: "products",
  });

  // === QUAN HỆ LIÊN QUAN ĐẾN ĐƠN HÀNG ===

  // Quan hệ Đơn hàng - Chi tiết đơn hàng (1-n)
  // Khi xóa đơn hàng sẽ xóa luôn chi tiết đơn hàng (CASCADE)
  Order.hasMany(OrderDetail, {
    foreignKey: "orderId",
    as: "orderDetails",
    onDelete: "CASCADE",
  });
  OrderDetail.belongsTo(Order, { foreignKey: "orderId", as: "order" });

  // Quan hệ Đơn hàng - Người dùng (n-1)
  // Một người dùng có thể có nhiều đơn hàng
  Order.belongsTo(Users, { foreignKey: "userId", as: "user" });
  Users.hasMany(Order, { foreignKey: "userId", as: "orders" });

  // Quan hệ Chi tiết đơn hàng với các bảng liên quan
  // Liên kết với sản phẩm, voucher và chi tiết sản phẩm
  OrderDetail.belongsTo(Product, { foreignKey: "productId", as: "product" });
  Product.hasMany(OrderDetail, { foreignKey: "productId", as: "orderDetails" });

  OrderDetail.belongsTo(Voucher, {
    foreignKey: "voucherId",
    as: "voucher",
    onDelete: "SET NULL", // Khi xóa voucher, giữ lại chi tiết đơn hàng
  });

  OrderDetail.belongsTo(ProductDetail, {
    foreignKey: "productDetailId",
    as: "productDetail",
    onDelete: "SET NULL",
  });
  ProductDetail.hasMany(OrderDetail, {
    foreignKey: "productDetailId",
    as: "productOrderDetails",
  });

  // Quan hệ Đơn hàng - Phương thức thanh toán (n-1)
  Order.belongsTo(PaymentMethod, {
    foreignKey: "paymentMethodId",
    as: "paymentMethod",
  });
  PaymentMethod.hasMany(Order, { foreignKey: "paymentMethodId", as: "orders" });

  // Quan hệ Đơn hàng - Trạng thái thanh toán (n-1)
  Order.belongsTo(PaymentStatus, {
    foreignKey: "paymentStatusId",
    as: "paymentStatus",
  });
  PaymentStatus.hasMany(Order, { foreignKey: "paymentStatusId", as: "orders" });

  // === QUAN HỆ LIÊN QUAN ĐẾN NGƯỜI DÙNG ===

  // Quan hệ Người dùng - Vai trò (n-1)
  Users.belongsTo(Role, { foreignKey: "roleId", as: "role" });
  Role.hasMany(Users, { foreignKey: "roleId", as: "users" });

  // Quan hệ Người dùng - Token làm mới (1-n)
  // Một người dùng có thể có nhiều refresh token (đăng nhập nhiều thiết bị)
  Users.hasMany(RefreshToken, { foreignKey: "userId", as: "refreshTokens" });
  RefreshToken.belongsTo(Users, { foreignKey: "userId", as: "user" });

  // Quan hệ Người dùng - Địa chỉ (1-n)
  Users.hasMany(UserAddress, { foreignKey: "userId", as: "addresses" });
  UserAddress.belongsTo(Users, { foreignKey: "userId", as: "user" });

  // Quan hệ Người dùng - Ghi chú (1-n)
  UserNote.belongsTo(Users, { foreignKey: "userId", as: "user" });
  Users.hasMany(UserNote, { foreignKey: "userId", as: "notes" });

  // === QUAN HỆ DANH MỤC VÀ ĐIỀU HƯỚNG ===

  // Quan hệ phân cấp Danh mục (cha-con)
  Category.hasMany(Category, {
    foreignKey: "parentId",
    as: "children",
  });
  Category.belongsTo(Category, {
    foreignKey: "parentId",
    as: "parent",
  });

  // Quan hệ Menu điều hướng - Danh mục (n-1)
  NavigationMenu.belongsTo(Category, {
    foreignKey: "categoryId",
    as: "category",
  });
  Category.hasMany(NavigationMenu, {
    foreignKey: "categoryId",
    as: "navigationMenus",
  });

  // === QUAN HỆ GIỎ HÀNG VÀ DANH SÁCH YÊU THÍCH ===

  // Quan hệ Người dùng - Giỏ hàng (1-1)
  Users.hasOne(Cart, { foreignKey: "userId", as: "cart" });
  Cart.belongsTo(Users, { foreignKey: "userId", as: "user" });

  // Quan hệ Giỏ hàng - Mục giỏ hàng (1-n)
  Cart.hasMany(CartItem, { foreignKey: "cartId", as: "items" });
  CartItem.belongsTo(Cart, { foreignKey: "cartId", as: "cart" });

  // Quan hệ Mục giỏ hàng với Sản phẩm và Chi tiết sản phẩm
  Product.hasMany(CartItem, { foreignKey: "productId", as: "cartItems" });
  CartItem.belongsTo(Product, { foreignKey: "productId", as: "product" });

  ProductDetail.hasMany(CartItem, {
    foreignKey: "productDetailId",
    as: "cartItems",
  });
  CartItem.belongsTo(ProductDetail, {
    foreignKey: "productDetailId",
    as: "productDetail",
  });

  // Quan hệ Danh sách yêu thích
  Wishlist.belongsTo(Users, { foreignKey: "userId", as: "user" });
  Users.hasMany(Wishlist, { foreignKey: "userId", as: "wishlists" });

  Wishlist.belongsTo(Product, { foreignKey: "productId", as: "product" });
  Product.hasMany(Wishlist, { foreignKey: "productId", as: "wishlists" });

  // === QUAN HỆ KÍCH THƯỚC SẢN PHẨM ===

  // Quan hệ Kích thước - Danh mục (n-1)
  // Mỗi danh mục có bộ kích thước riêng
  ProductSize.belongsTo(Category, { foreignKey: "categoryId", as: "category" });
  Category.hasMany(ProductSize, { foreignKey: "categoryId", as: "sizes" });
}
