# Online Store Backend API

Hệ thống backend cho cửa hàng trực tuyến được xây dựng với Node.js, Express, TypeScript và MySQL.

## 🛠️ Công nghệ sử dụng

### Backend Framework & Language

- **Node.js** - Môi trường runtime JavaScript
- **Express.js** - Web framework cho Node.js
- **TypeScript** - Ngôn ngữ lập trình có tính kiểu mạnh

### Database & ORM

- **MySQL** - Cơ sở dữ liệu quan hệ (thông qua XAMPP)
- **XAMPP** - Gói phần mềm Apache, MySQL, PHP và Perl
- **Sequelize** - Object-Relational Mapping (ORM) cho Node.js
- **mysql2** - Thư viện driver/connector để kết nối Node.js với MySQL database

### Authentication & Security

- **jsonwebtoken** - Thư viện tạo và xác thực JSON Web Token
- **bcrypt/bcryptjs** - Mã hóa mật khẩu
- **cors** - Middleware xử lý Cross-Origin Resource Sharing
- **cookie-parser** - Phân tích và xử lý cookies

### File Upload & Cloud Storage

- **multer** - Middleware xử lý upload file multipart/form-data
- **multer-s3** - Tích hợp multer với Amazon S3
- **aws-sdk** - AWS Software Development Kit cho Node.js

### Email Service

- **nodemailer** - Thư viện gửi email

### Utilities & Tools

- **dotenv** - Quản lý biến môi trường từ file .env
- **slugify** - Tạo URL-friendly strings (slug)
- **uuid** - Tạo unique identifiers
- **date-fns** - Thư viện xử lý và định dạng ngày tháng

### Development & Build Tools

- **nodemon** - Tự động restart server khi có thay đổi file trong quá trình phát triển (development mode)
- **ts-node** - Chạy file TypeScript trực tiếp mà không cần biên dịch thành JavaScript trước
- **typescript** - Trình biên dịch TypeScript, chuyển đổi code TypeScript thành JavaScript

### Type Definitions (DevDependencies)

- **@types/\*** - Type definitions cho TypeScript của các thư viện JavaScript

## 📁 Cấu trúc dự án

```
online-store-backend/
├── src/
│   ├── index.ts                 # Entry point của ứng dụng (file đầu tiên được chạy)
│   ├── config/
│   │   └── db.ts               # Cấu hình kết nối database
│   ├── controllers/            # Xử lý logic nghiệp vụ
│   │   ├── User.controller.ts
│   │   ├── Product.controller.ts
│   │   ├── Order.Controller.ts
│   │   └── ...
│   ├── models/                 # Định nghĩa models Sequelize
│   │   ├── Users.ts
│   │   ├── Product.ts
│   │   ├── Order.ts
│   │   └── associations.ts     # Định nghĩa quan hệ giữa models
│   ├── routes/                 # Định nghĩa API routes
│   │   ├── Auth.route.ts
│   │   ├── Product.route.ts
│   │   └── ...
│   ├── middlewares/            # Custom middlewares
│   │   ├── authMiddleware.ts   # Xác thực JWT
│   │   ├── roleMiddleware.ts   # Phân quyền
│   │   └── ...
│   ├── services/               # Business logic và external services
│   │   ├── imageUpload.ts      # Xử lý upload ảnh
│   │   └── ...
│   └── utils/                  # Utility functions
│       ├── email.ts           # Gửi email
│       └── ...
├── public/                     # Static files
│   └── uploads/               # Uploaded files
├── uploads/                   # File uploads storage
├── package.json              # Dependencies và scripts
├── tsconfig.json             # TypeScript configuration
├── Dockerfile               # Docker configuration
└── README.md               # Documentation
```

## 🚀 Cài đặt và chạy

### Yêu cầu hệ thống

- Node.js (version 14+)
- MySQL (version 8+)
- npm hoặc yarn

### Cài đặt

```bash
# Clone repository
git clone <repository-url>
cd online-store-backend

# Cài đặt dependencies
npm install

# Tạo file .env từ .env.example
cp .env.example .env
```

### Cấu hình môi trường

Tạo file `.env` với các biến sau:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=online_store
PORT=5000
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=your_aws_region
S3_BUCKET_NAME=your_s3_bucket
VNPAY_TMN_CODE=your_vnpay_code
VNPAY_HASH_SECRET=your_vnpay_secret
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:3000/payment/result
FRONTEND_URL=http://localhost:3000
GMAIL_USER=your_gmail_user
GMAIL_APP_PASSWORD=your_gmail_app_password(16 ký tự)
EMAIL_FROM_NAME=(optional) Online Store
```

### Chạy ứng dụng

```bash
# Development mode
npm run dev

# Build và chạy production
npm run build
npm start
```

## 🔐 Authentication & Authorization

Hệ thống sử dụng JWT tokens với các vai trò:

- **Role 1**: Admin (Toàn quyền)
- **Role 2**: Employee (Quyền hạn chế)
- **Role 3**: User/Customer (Người dùng thông thường)

### Headers cần thiết cho các API bảo mật:

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

## 📚 API Documentation

### 🔑 Authentication APIs (`/api/auth`)

#### 1. Đăng ký tài khoản

```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "testuser",
  "email": "user@example.com",
  "password": "password123",
  "phoneNumber": "0123456789",
  "dateOfBirth": "1990-01-01"
}
```

**Response Success (201):**

```json
{
  "message": "Đăng ký thành công",
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "user@example.com",
    "roleId": 2
  }
}
```

#### 2. Đăng nhập

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response Success (200):**

```json
{
  "message": "Đăng nhập thành công",
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "user@example.com",
    "roleId": 2
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 3. Làm mới token

```http
POST /api/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "your_refresh_token"
}
```

#### 4. Đăng xuất

```http
POST /api/auth/logout
```

#### 5. Quên mật khẩu

```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### 6. Kiểm tra token reset password

```http
GET /api/auth/reset-password/:token
```

#### 7. Đặt lại mật khẩu

```http
POST /api/auth/reset-password/:token
Content-Type: application/json

{
  "password": "newpassword123"
}
```

#### 8. Admin test endpoint

```http
GET /api/auth/admin
Authorization: Bearer <admin_token>
```

### 👥 User APIs (`/api/users`)

#### 1. Lấy thông tin người dùng hiện tại

```http
GET /api/users/me
Authorization: Bearer <access_token>
```

#### 2. Cập nhật thông tin cá nhân

```http
PUT /api/users/me
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "fullName": "Nguyễn Văn B",
  "phoneNumber": "0987654321",
  "dateOfBirth": "1990-01-01"
}
```

#### 3. Đổi mật khẩu

```http
PUT /api/users/change-password
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

#### 4. Lấy danh sách người dùng (Admin/Employee)

```http
GET /api/users
Authorization: Bearer <admin_token>
```

#### 5. Lấy thông tin người dùng theo ID (Admin/Employee)

```http
GET /api/users/:id
Authorization: Bearer <admin_token>
```

#### 6. Cập nhật thông tin người dùng theo ID (Admin)

```http
PUT /api/users/:id
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "fullName": "Nguyễn Văn C",
  "phoneNumber": "0123456789",
  "roleId": 2
}
```

#### 7. Khóa/Mở khóa tài khoản (Admin)

```http
PATCH /api/users/:id/toggle-status
Authorization: Bearer <admin_token>
```

### 🛍️ Product APIs (`/api/products`)

#### 1. Lấy danh sách sản phẩm với variants

```http
GET /api/products?page=1&limit=10&search=áo&categoryId=1&minPrice=100000&maxPrice=500000&sortBy=price&sortOrder=asc&isNew=true&isOnSale=true&featured=true&brand=Nike&material=Cotton&suitability=casual&subtype=T-SHIRT
```

**Query Parameters:**

- `page`: Trang hiện tại (mặc định: 1)
- `limit`: Số sản phẩm trên mỗi trang (mặc định: 10)
- `search`: Tìm kiếm theo tên sản phẩm
- `categoryId`: Lọc theo danh mục
- `minPrice`, `maxPrice`: Lọc theo khoảng giá
- `sortBy`: Sắp xếp theo (name, price, createdAt)
- `sortOrder`: Thứ tự sắp xếp (asc, desc)
- `isNew`: Lọc sản phẩm mới
- `isOnSale`: Lọc sản phẩm giảm giá
- `featured`: Lọc sản phẩm nổi bật
- `brand`: Lọc theo thương hiệu
- `material`: Lọc theo chất liệu
- `suitability`: Lọc theo phù hợp
- `subtype`: Lọc theo loại phụ

#### 2. Lấy chi tiết sản phẩm

```http
GET /api/products/:id
```

#### 3. Lấy breadcrumb sản phẩm

```http
GET /api/products/:id/breadcrumb
```

#### 4. Lấy variants của sản phẩm

```http
GET /api/products/variants/:id
```

#### 5. Lấy sản phẩm theo danh mục

```http
GET /api/products/category/:categoryId?page=1&limit=10
```

#### 6. Lấy danh sách suitabilities

```http
GET /api/products/suitabilities
```

#### 7. Lấy danh sách subtypes

```http
GET /api/products/subtypes
```

#### 8. Lấy danh sách sizes

```http
GET /api/products/sizes
```

#### 9. Lấy sizes theo danh mục

```http
GET /api/products/by-category
```

#### 10. Tạo sản phẩm mới (Admin)

```http
POST /api/products
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

name: Áo thun nam cotton
description: Áo thun chất liệu cotton cao cấp
brand: Nike
material: Cotton
featured: true
tags: ["áo thun", "nam", "cotton"]
suitability: ["casual", "daily"]
subtype: T-SHIRT
isNew: true
isOnSale: false
images: [file1, file2, file3]
variants: [
  {
    "size": "M",
    "color": "Đỏ",
    "price": 299000,
    "salePrice": 249000,
    "stock": 50
  }
]
categoryIds: [1, 2]
```

#### 11. Cập nhật thông tin cơ bản sản phẩm (Admin/Employee)

```http
PATCH /api/products/:id/basic-info
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Áo thun nam cotton cập nhật",
  "description": "Mô tả mới",
  "brand": "Adidas",
  "material": "Cotton blend"
}
```

#### 12. Cập nhật inventory sản phẩm (Admin/Employee)

```http
PATCH /api/products/:id/inventory
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "variants": [
    {
      "id": 1,
      "stock": 100
    }
  ]
}
```

#### 13. Thêm hình ảnh sản phẩm (Admin)

```http
POST /api/products/:id/images
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

images: [file1, file2, file3]
```

#### 14. Xóa hình ảnh sản phẩm (Admin)

```http
DELETE /api/products/:id/images
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "imageIds": [1, 2, 3]
}
```

#### 15. Đặt hình ảnh chính (Admin)

```http
PATCH /api/products/:id/images/:imageId/main
Authorization: Bearer <admin_token>
```

#### 16. Cập nhật variants sản phẩm (Admin/Employee)

```http
PATCH /api/products/:id/variants
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "variants": [
    {
      "id": 1,
      "size": "L",
      "color": "Xanh",
      "price": 320000,
      "salePrice": 280000,
      "stock": 30
    }
  ]
}
```

#### 17. Xóa sản phẩm (Admin)

```http
DELETE /api/products/:id
Authorization: Bearer <admin_token>
```

#### 18. Tạo size mới (Admin)

```http
POST /api/products/sizes
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "XXL",
  "categoryId": 1,
  "order": 5
}
```

#### 19. Cập nhật size (Admin)

```http
PUT /api/products/sizes/:id
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "3XL",
  "order": 6
}
```

#### 20. Xóa size (Admin)

```http
DELETE /api/products/sizes/:id
Authorization: Bearer <admin_token>
```

### 📂 Category APIs (`/api/categories`)

#### 1. Lấy danh sách tất cả danh mục

```http
GET /api/categories
```

#### 2. Lấy danh mục cho navigation

```http
GET /api/categories/nav
```

#### 3. Lấy chi tiết danh mục theo ID

```http
GET /api/categories/:id
```

#### 4. Lấy danh mục con theo ID danh mục cha

```http
GET /api/categories/:id/subcategories
```

#### 5. Lấy breadcrumb cho danh mục

```http
GET /api/categories/slug/:slug/breadcrumb
```

#### 6. Lấy danh mục theo slug

```http
GET /api/categories/slug/:slug
```

#### 7. Lấy sản phẩm theo slug danh mục

```http
GET /api/categories/slug/:slug/products?page=1&limit=10
```

#### 8. Tạo danh mục mới (Admin)

```http
POST /api/categories
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Áo thun",
  "slug": "ao-thun",
  "description": "Danh mục áo thun",
  "parentId": null,
  "isActive": true,
  "order": 1
}
```

#### 9. Cập nhật danh mục (Admin)

```http
PUT /api/categories/:id
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Áo thun nam",
  "description": "Danh mục áo thun dành cho nam",
  "isActive": true
}
```

#### 10. Xóa danh mục (Admin)

```http
DELETE /api/categories/:id
Authorization: Bearer <admin_token>
```

### 🛒 Cart APIs (`/api/cart`)

#### 1. Kiểm tra tồn kho sản phẩm

```http
POST /api/cart/check-stock
Content-Type: application/json

{
  "items": [
    {
      "productDetailId": 1,
      "quantity": 2
    }
  ]
}
```

#### 2. Lấy giỏ hàng của user

```http
GET /api/cart
Authorization: Bearer <access_token>
```

#### 3. Thêm sản phẩm vào giỏ

```http
POST /api/cart/items
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "productDetailId": 1,
  "quantity": 2
}
```

#### 4. Cập nhật số lượng sản phẩm

```http
PUT /api/cart/items/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "quantity": 3
}
```

#### 5. Xóa sản phẩm khỏi giỏ

```http
DELETE /api/cart/items/:id
Authorization: Bearer <access_token>
```

#### 6. Xóa toàn bộ giỏ hàng

```http
DELETE /api/cart
Authorization: Bearer <access_token>
```

#### 7. Merge giỏ hàng từ cookies

```http
POST /api/cart/merge
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "cartItems": [
    {
      "productDetailId": 1,
      "quantity": 2
    }
  ]
}
```

### 📦 Order APIs (`/api/orders`)

#### 1. Tạo đơn hàng mới

```http
POST /api/orders
Content-Type: application/json

{
  "customerInfo": {
    "fullName": "Nguyễn Văn A",
    "email": "user@example.com",
    "phoneNumber": "0123456789"
  },
  "shippingAddress": {
    "fullName": "Nguyễn Văn A",
    "phoneNumber": "0123456789",
    "address": "123 Đường ABC",
    "ward": "Phường 1",
    "district": "Quận 1",
    "province": "TP.HCM"
  },
  "items": [
    {
      "productDetailId": 1,
      "quantity": 2,
      "price": 299000
    }
  ],
  "paymentMethod": "CASH",
  "voucherCode": "SALE10",
  "notes": "Giao hàng buổi sáng",
  "shippingFee": 30000
}
```

#### 2. Tính phí vận chuyển cho giỏ hàng

```http
POST /api/orders/shipping-fee
Content-Type: application/json

{
  "items": [
    {
      "productDetailId": 1,
      "quantity": 2
    }
  ],
  "shippingAddress": {
    "province": "TP.HCM",
    "district": "Quận 1"
  }
}
```

#### 3. Lấy tất cả đơn hàng (Admin)

```http
GET /api/orders/admin/all?page=1&limit=10&status=PENDING&search=ORD123&startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <admin_token>
```

#### 4. Lấy tất cả đơn hàng (Employee) - hạn chế thông tin

```http
GET /api/orders/employee/all?page=1&limit=10&status=PROCESSING
Authorization: Bearer <employee_token>
```

#### 5. Lấy đơn hàng của user hiện tại

```http
GET /api/orders/my-orders?page=1&limit=10&status=DELIVERED
Authorization: Bearer <access_token>
```

#### 6. Lấy đơn hàng của user theo ID (Admin/Employee)

```http
GET /api/orders/user/:userId?page=1&limit=10
Authorization: Bearer <admin_token>
```

#### 7. Lấy chi tiết đơn hàng

```http
GET /api/orders/:id
```

#### 8. Cập nhật trạng thái đơn hàng (Admin/Employee)

```http
PUT /api/orders/:id/status
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "status": "PROCESSING"
}
```

**Các trạng thái có thể:**

- `PENDING`: Chờ xử lý
- `PROCESSING`: Đang xử lý
- `SHIPPING`: Đang giao hàng
- `DELIVERED`: Đã giao hàng
- `CANCELLED`: Đã hủy
- `RETURNED`: Đã trả hàng

#### 9. Cập nhật trạng thái thanh toán (Admin)

```http
PUT /api/orders/:id/payment-status
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "paymentStatus": "PAID"
}
```

#### 10. Cập nhật địa chỉ giao hàng (Admin)

```http
PUT /api/orders/:id/shipping
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "shippingAddress": {
    "fullName": "Nguyễn Văn B",
    "phoneNumber": "0987654321",
    "address": "456 Đường XYZ",
    "ward": "Phường 2",
    "district": "Quận 2",
    "province": "TP.HCM"
  }
}
```

#### 11. Xử lý hoàn tiền (Admin)

```http
POST /api/orders/:id/refund
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "refundAmount": 500000,
  "refundReason": "Sản phẩm lỗi"
}
```

#### 12. Hủy đơn hàng

```http
PUT /api/orders/:id/cancel
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "cancelReason": "Khách hàng thay đổi ý định"
}
```

#### 13. Tự động hủy đơn hàng pending (Admin)

```http
POST /api/orders/auto-cancel-pending
Authorization: Bearer <admin_token>
```

### 💳 Payment APIs (`/api/payment`)

#### 1. Tạo URL thanh toán VNPay

```http
POST /api/payment/vnpay/create-payment-url
Content-Type: application/json

{
  "orderId": "ORD123456",
  "amount": 598000,
  "orderDescription": "Thanh toán đơn hàng ORD123456",
  "returnUrl": "http://localhost:3000/payment/result"
}
```

#### 2. Xử lý kết quả trả về từ VNPay

```http
GET /api/payment/vnpay/payment-return?vnp_Amount=59800000&vnp_BankCode=NCB&vnp_ResponseCode=00&...
```

#### 3. Xử lý IPN từ VNPay

```http
GET /api/payment/vnpay/ipn?vnp_Amount=59800000&vnp_ResponseCode=00&...
```

#### 4. Kiểm tra trạng thái thanh toán

```http
GET /api/payment/check-status/:orderId
```

### 🎫 Voucher APIs (`/api/vouchers`)

#### 1. Lấy danh sách voucher (Admin)

```http
GET /api/vouchers
Authorization: Bearer <admin_token>
```

#### 2. Lấy voucher khả dụng cho user

```http
GET /api/vouchers/user/available
Authorization: Bearer <access_token>
```

#### 3. Lấy voucher theo mã code

```http
GET /api/vouchers/:code
```

#### 4. Kiểm tra và áp dụng voucher

```http
POST /api/vouchers/validate
Content-Type: application/json

{
  "code": "SALE10",
  "totalAmount": 500000,
  "userId": 1
}
```

#### 5. Tăng lượt sử dụng voucher

```http
POST /api/vouchers/:id/increment-usage
Content-Type: application/json

{
  "userId": 1
}
```

#### 6. Tạo voucher mới (Admin)

```http
POST /api/vouchers
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "code": "SALE20",
  "name": "Giảm giá 20%",
  "description": "Giảm 20% cho đơn hàng từ 500k",
  "type": "PERCENTAGE",
  "value": 20,
  "minOrderAmount": 500000,
  "maxDiscountAmount": 100000,
  "usageLimit": 100,
  "usageLimitPerUser": 1,
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "isActive": true,
  "applicableProducts": [1, 2, 3],
  "applicableCategories": [1, 2]
}
```

**Loại voucher:**

- `PERCENTAGE`: Giảm theo phần trăm
- `FIXED_AMOUNT`: Giảm số tiền cố định

#### 7. Cập nhật voucher (Admin)

```http
PUT /api/vouchers/:id
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Giảm giá 25%",
  "value": 25,
  "isActive": false
}
```

#### 8. Xóa voucher (Admin)

```http
DELETE /api/vouchers/:id
Authorization: Bearer <admin_token>
```

### 📍 User Address APIs (`/api/user-addresses`)

#### 1. Lấy địa chỉ của user hiện tại

```http
GET /api/user-addresses
Authorization: Bearer <access_token>
```

#### 2. Lấy địa chỉ theo ID

```http
GET /api/user-addresses/:id
Authorization: Bearer <access_token>
```

#### 3. Thêm địa chỉ mới

```http
POST /api/user-addresses
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "fullName": "Nguyễn Văn A",
  "phoneNumber": "0123456789",
  "address": "123 Đường ABC",
  "ward": "Phường 1",
  "district": "Quận 1",
  "province": "TP.HCM",
  "isDefault": true
}
```

#### 4. Cập nhật địa chỉ

```http
PUT /api/user-addresses/:id
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "fullName": "Nguyễn Văn B",
  "address": "456 Đường XYZ",
  "ward": "Phường 2"
}
```

#### 5. Đặt làm địa chỉ mặc định

```http
PUT /api/user-addresses/:id/default
Authorization: Bearer <access_token>
```

#### 6. Xóa địa chỉ

```http
DELETE /api/user-addresses/:id
Authorization: Bearer <access_token>
```

#### 7. Lấy địa chỉ của user theo ID (Admin)

```http
GET /api/user-addresses/admin/users/:userId/addresses
Authorization: Bearer <admin_token>
```

#### 8. Lấy địa chỉ theo ID cho Admin

```http
GET /api/user-addresses/admin/addresses/:id
Authorization: Bearer <admin_token>
```

#### 9. Tạo địa chỉ cho user (Admin)

```http
POST /api/user-addresses/admin/users/:userId/addresses
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "fullName": "Nguyễn Văn C",
  "phoneNumber": "0123456789",
  "address": "789 Đường DEF",
  "ward": "Phường 3",
  "district": "Quận 3",
  "province": "TP.HCM"
}
```

#### 10. Cập nhật địa chỉ (Admin)

```http
PUT /api/user-addresses/admin/addresses/:id
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "fullName": "Nguyễn Văn D",
  "phoneNumber": "0987654321"
}
```

#### 11. Đặt địa chỉ mặc định (Admin)

```http
PUT /api/user-addresses/admin/addresses/:id/default
Authorization: Bearer <admin_token>
```

#### 12. Xóa địa chỉ (Admin)

```http
DELETE /api/user-addresses/admin/addresses/:id
Authorization: Bearer <admin_token>
```

### ❤️ Wishlist APIs (`/api/wishlist`)

#### 1. Lấy danh sách yêu thích

```http
GET /api/wishlist
Authorization: Bearer <access_token>
```

#### 2. Thêm vào yêu thích

```http
POST /api/wishlist
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "productId": 1
}
```

#### 3. Xóa khỏi yêu thích

```http
DELETE /api/wishlist/:productId
Authorization: Bearer <access_token>
```

#### 4. Kiểm tra sản phẩm có trong yêu thích

```http
GET /api/wishlist/check/:productId
Authorization: Bearer <access_token>
```

### 📊 Reports APIs (`/api/reports`) - Admin Only

#### 1. Báo cáo tổng quan

```http
GET /api/reports/summary?startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <admin_token>
```

**Response:**

```json
{
  "totalRevenue": 15000000,
  "totalOrders": 150,
  "totalCustomers": 75,
  "averageOrderValue": 100000,
  "topSellingProduct": "Áo thun nam cotton"
}
```

#### 2. Báo cáo doanh thu

```http
GET /api/reports/revenue?period=month&year=2024&month=12
Authorization: Bearer <admin_token>
```

**Parameters:**

- `period`: day, month, year
- `year`: Năm
- `month`: Tháng (khi period=day hoặc month)

#### 3. Báo cáo top danh mục

```http
GET /api/reports/top-categories?limit=10&startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <admin_token>
```

#### 4. Sản phẩm bán chạy

```http
GET /api/reports/top-products?limit=10&startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <admin_token>
```

#### 5. Sản phẩm sắp hết hàng

```http
GET /api/reports/low-stock?threshold=10
Authorization: Bearer <admin_token>
```

#### 6. Hiệu suất sản phẩm

```http
GET /api/reports/product-performance?productId=1&startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <admin_token>
```

#### 7. Hiệu suất danh mục

```http
GET /api/reports/category-performance?categoryId=1&startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <admin_token>
```

#### 8. Phân tích đơn hàng

```http
GET /api/reports/order-analysis?period=month&year=2024
Authorization: Bearer <admin_token>
```

### 🗂️ Navigation Menu APIs (`/api/navigation`)

#### 1. Lấy menu công khai

```http
GET /api/navigation/public
```

#### 2. Lấy tất cả menu (Admin)

```http
GET /api/navigation
Authorization: Bearer <admin_token>
```

#### 3. Tạo menu mới (Admin)

```http
POST /api/navigation
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Trang chủ",
  "url": "/",
  "order": 1,
  "isActive": true,
  "parentId": null,
  "icon": "home"
}
```

#### 4. Cập nhật menu (Admin)

```http
PUT /api/navigation/:id
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Sản phẩm",
  "url": "/products",
  "order": 2
}
```

#### 5. Xóa menu (Admin)

```http
DELETE /api/navigation/:id
Authorization: Bearer <admin_token>
```

### 🔧 Admin Menu APIs (`/api/admin-menu`)

#### 1. Lấy menu admin cho sidebar

```http
GET /api/admin-menu
Authorization: Bearer <admin_token>
```

#### 2. Lấy danh sách menu để quản lý (Admin)

```http
GET /api/admin-menu/manage
Authorization: Bearer <admin_token>
```

#### 3. Tạo menu item mới (Admin)

```http
POST /api/admin-menu/manage
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Quản lý sản phẩm",
  "url": "/admin/products",
  "icon": "package",
  "order": 1,
  "parentId": null,
  "isActive": true,
  "roles": [1, 2]
}
```

#### 4. Cập nhật thứ tự menu (Admin)

```http
PUT /api/admin-menu/manage/order
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "menuItems": [
    {
      "id": 1,
      "order": 1
    },
    {
      "id": 2,
      "order": 2
    }
  ]
}
```

#### 5. Cập nhật menu item (Admin)

```http
PUT /api/admin-menu/manage/:id
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Quản lý đơn hàng",
  "url": "/admin/orders",
  "isActive": false
}
```

#### 6. Xóa menu item (Admin)

```http
DELETE /api/admin-menu/manage/:id
Authorization: Bearer <admin_token>
```

### 📝 User Notes APIs (`/api/user-notes`) - Admin/Employee Only

#### 1. Thêm ghi chú cho user

```http
POST /api/user-notes/users/:id/notes
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "content": "Khách hàng VIP, ưu tiên xử lý",
  "type": "GENERAL"
}
```

**Loại ghi chú:**

- `GENERAL`: Ghi chú chung
- `WARNING`: Cảnh báo
- `IMPORTANT`: Quan trọng

#### 2. Lấy ghi chú của user

```http
GET /api/user-notes/users/:id/notes
Authorization: Bearer <admin_token>
```

#### 3. Cập nhật ghi chú

```http
PUT /api/user-notes/notes/:noteId
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "content": "Khách hàng đã thanh toán đầy đủ",
  "type": "IMPORTANT"
}
```

#### 4. Xóa ghi chú

```http
DELETE /api/user-notes/notes/:noteId
Authorization: Bearer <admin_token>
```

### 🎯 Suitability APIs (`/api/suitability`)

#### 1. Lấy tất cả suitabilities

```http
GET /api/suitability
```

#### 2. Tạo suitability mới (Admin)

```http
POST /api/suitability
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Thể thao",
  "code": "sport",
  "description": "Phù hợp cho hoạt động thể thao",
  "order": 1,
  "isActive": true
}
```

#### 3. Cập nhật thứ tự suitabilities (Admin)

```http
PUT /api/suitability/reorder
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "suitabilities": [
    {
      "id": 1,
      "order": 1
    },
    {
      "id": 2,
      "order": 2
    }
  ]
}
```

#### 4. Cập nhật suitability (Admin)

```http
PUT /api/suitability/:id
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Dạo phố",
  "description": "Phù hợp cho việc dạo phố",
  "isActive": true
}
```

#### 5. Xóa suitability (Admin)

```http
DELETE /api/suitability/:id
Authorization: Bearer <admin_token>
```

### 🔗 Product Category APIs (`/api/product-categories`)

#### 1. Thêm danh mục vào sản phẩm

```http
POST /api/product-categories
Content-Type: application/json

{
  "productId": 1,
  "categoryId": 2
}
```

#### 2. Xóa danh mục khỏi sản phẩm

```http
DELETE /api/product-categories
Content-Type: application/json

{
  "productId": 1,
  "categoryId": 2
}
```

### 📋 Product Detail APIs (`/api/product-details`)

#### 1. Lấy danh sách chi tiết sản phẩm

```http
GET /api/product-details
```

#### 2. Lấy chi tiết sản phẩm theo ID

```http
GET /api/product-details/:id
```

#### 3. Lấy chi tiết sản phẩm theo Product ID

```http
GET /api/product-details/product/:productId
```

#### 4. Tạo chi tiết sản phẩm (Admin)

```http
POST /api/product-details
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "productId": 1,
  "size": "L",
  "color": "Đỏ",
  "price": 299000,
  "salePrice": 249000,
  "stock": 50,
  "sku": "AT001-L-RED"
}
```

#### 5. Cập nhật chi tiết sản phẩm (Admin)

```http
PUT /api/product-details/:id
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "price": 320000,
  "salePrice": 280000,
  "stock": 75
}
```

#### 6. Xóa chi tiết sản phẩm (Admin)

```http
DELETE /api/product-details/:id
Authorization: Bearer <admin_token>
```

### 🖼️ Product Image APIs (`/api/product-images`)

#### 1. Upload hình ảnh cho Product Detail (Admin)

```http
POST /api/product-images/:productDetailId
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

images: [file1, file2, file3]
```

#### 2. Xóa hình ảnh (Admin)

```http
DELETE /api/product-images/:id
Authorization: Bearer <admin_token>
```

#### 3. Đặt làm hình ảnh chính (Admin)

```http
PUT /api/product-images/:id/main
Authorization: Bearer <admin_token>
```

## 📱 Postman Collection

### Environment Variables

Tạo environment trong Postman với các biến sau:

```json
{
  "base_url": "http://localhost:5000",
  "access_token": "",
  "refresh_token": "",
  "admin_token": "",
  "user_id": ""
}
```

### Pre-request Script để tự động set token

```javascript
// Trong Pre-request Script của collection
if (pm.environment.get("access_token")) {
  pm.request.headers.add({
    key: "Authorization",
    value: "Bearer " + pm.environment.get("access_token"),
  });
}
```

### Test Script để tự động lưu token

```javascript
// Trong Test Script của login request
if (pm.response.code === 200) {
  const responseJson = pm.response.json();
  pm.environment.set("access_token", responseJson.accessToken);
  pm.environment.set("refresh_token", responseJson.refreshToken);
  pm.environment.set("user_id", responseJson.user.id);
}
```

## ⚠️ Error Responses

Tất cả API trả về error theo format:

```json
{
  "success": false,
  "message": "Error message",
  "error": "Error details",
  "statusCode": 400
}
```

### Mã lỗi thường gặp:

- **400 Bad Request**: Dữ liệu đầu vào không hợp lệ
- **401 Unauthorized**: Không có token hoặc token không hợp lệ
- **403 Forbidden**: Không đủ quyền hạn để thực hiện hành động
- **404 Not Found**: Không tìm thấy tài nguyên
- **409 Conflict**: Xung đột dữ liệu (ví dụ: email đã tồn tại)
- **422 Unprocessable Entity**: Dữ liệu không thể xử lý
- **500 Internal Server Error**: Lỗi server

### Validation Errors

Khi có lỗi validation, API trả về format chi tiết:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Email không hợp lệ"
    },
    {
      "field": "password",
      "message": "Mật khẩu phải có ít nhất 6 ký tự"
    }
  ]
}
```

## 🔒 Security Notes

### Authentication

1. **JWT Tokens**: Hệ thống sử dụng Access Token (15 phút) và Refresh Token (7 ngày)
2. **Token Refresh**: Tự động làm mới token khi Access Token hết hạn
3. **Password Hashing**: Sử dụng bcrypt với salt rounds = 10

### Authorization

1. **Role-based Access Control**:

   - Role 1: Admin (toàn quyền)
   - Role 2: Employee (quyền hạn chế)
   - Role 3: User/Customer

2. **Permission-based**: Một số endpoint sử dụng permission chi tiết hơn role

### Data Protection

1. **Input Validation**: Tất cả input được validate
2. **SQL Injection Prevention**: Sử dụng Sequelize ORM
3. **XSS Prevention**: Sanitize user input
4. **CORS**: Cấu hình cho specific domains
5. **Rate Limiting**: Áp dụng cho sensitive endpoints

### File Upload Security

1. **File Type Validation**: Chỉ chấp nhận image files
2. **File Size Limit**: Giới hạn size upload
3. **S3 Storage**: Files được lưu trên AWS S3
4. **Secure URLs**: Sử dụng signed URLs khi cần thiết

## 📞 Support & Troubleshooting

### Thường gặp

1. **Token hết hạn**: Sử dụng refresh token để lấy token mới
2. **CORS Error**: Kiểm tra domain có được whitelist không
3. **File upload fail**: Kiểm tra file type và size
4. **Permission denied**: Xác nhận user có đủ quyền hạn

### Debug Tips

1. **Log requests**: Check server logs cho detailed errors
2. **Network tab**: Sử dụng browser DevTools để debug
3. **Postman Console**: Xem detailed request/response
4. **Environment variables**: Đảm bảo tokens được set đúng

### Contact

Nếu gặp vấn đề không thể giải quyết:

1. Kiểm tra server logs
2. Verify API endpoint và HTTP method
3. Confirm request headers và body format
4. Test với Postman trước khi integrate

---

**Happy Coding! 🚀**
