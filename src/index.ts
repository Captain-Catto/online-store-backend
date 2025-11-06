//
import sequelize from "./config/db";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import { checkExpiredPayments } from "./middlewares/orderCheckMiddleware";

// Import các models
import "./models/Role";
import "./models/Users";
import "./models/RefreshToken";
import "./models/Product";
import "./models/Category";
import "./models/ProductCategory";
import "./models/ProductDetail";
import "./models/ProductInventory";
import "./models/PaymentMethod";
import "./models/PaymentStatus";
import "./models/Order";
import "./models/OrderDetail";
import "./models/Voucher";

import initAssociations from "./models/associations";
initAssociations();

// import routes
import authRoutes from "./routes/Auth.route";
import productRoutes from "./routes/Product.route";
import productDetailRoutes from "./routes/ProductDetail.route";
import categoryRoutes from "./routes/Category.route";
import voucherRoutes from "./routes/Voucher.route";
import productCategoryRoutes from "./routes/ProductCategory.route";
import productImageRoutes from "./routes/ProductImage.route";
import orderRoutes from "./routes/Order.route";
import userAddressRoutes from "./routes/UserAddress.route";
import userRoutes from "./routes/User.route";
import UserNoteRoutes from "./routes/UserNotes.route";
import navigationMenuRoutes from "./routes/NaviagationMenu.route";
import wishlistRoutes from "./routes/Wishlist.route";
import suitabilityRoutes from "./routes/Suitability.route";
import AdminMenuItemRoutes from "./routes/AdminMenu.route";
import cartRoutes from "./routes/Cart.route";
import reportsRoutes from "./routes/Reports.route";
import paymentRoutes from "./routes/Payment.route";

dotenv.config();

const CorsOptions = {
  origin: [
    "http://localhost:3001",
    "http://localhost:3000",
    "https://online-store-sigma-nine.vercel.app",
    "https://online-store.lequangtridat.com",
    "https://lequangtridat.com",
  ],
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

const app = express();
// Cấu hình để phục vụ file tĩnh
app.use(
  "/online-store/uploads",
  express.static(path.join(__dirname, "../public/uploads"))
);
app.use(cookieParser());
app.use(cors(CorsOptions));
app.use(express.json());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/product-details", productDetailRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/vouchers", voucherRoutes);
app.use("/api/product-categories", productCategoryRoutes);
app.use("/api/product-images", productImageRoutes);
// Middleware kiểm tra đơn hàng quá hạn thanh toán sẽ được kích hoạt khi truy cập route đơn hàng
app.use("/api/orders", checkExpiredPayments, orderRoutes);
app.use("/api/user-addresses", userAddressRoutes);
app.use("/api/users", userRoutes);
app.use("/api/user-notes", UserNoteRoutes);
app.use("/api/navigation", navigationMenuRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/suitabilities", suitabilityRoutes);
app.use("/api/admin-menu", AdminMenuItemRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/payments", paymentRoutes);
// Middleware xử lý lỗi

// Health check endpoint
app.get("/", (req, res) => {
  res.json({ message: "Online Store API is running!" });
});

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!" });
});

// Port configuration for cPanel
const PORT = process.env.PORT || 3000;

// Kết nối DB
sequelize
  .sync({ force: false })
  .then(() => {
    console.log("Database connected!");
    console.log(`Server running with db name ${process.env.DB_NAME}`);

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Database connection failed:", error);
  });
