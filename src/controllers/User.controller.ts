import { Request, Response } from "express";
import Users from "../models/Users";
import RefreshToken from "../models/RefreshToken";
import bcrypt from "bcryptjs";
import jwt, { JwtPayload } from "jsonwebtoken";
import UserAddress from "../models/UserAddress";
import Role from "../models/Role";
import PasswordReset from "../models/PasswordReset";
import crypto from "crypto";
import { sendEmail } from "../utils/email";
import { Op, Sequelize } from "sequelize";
import Order from "../models/Order";
import sequelize from "sequelize";

/**
 * Tạo mới access token từ refresh token
 *
 * Quy trình:
 * 1. Kiểm tra refresh token trong cookie
 * 2. Xác thực token trong database
 * 3. Tạo access token mới nếu hợp lệ
 * 4. Xử lý các trường hợp lỗi và hết hạn
 *
 * @param req - Request chứa refresh token trong cookie
 * @param res - Response trả về access token mới
 */
export const refreshToken = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Lấy refreshToken từ cookie
    const refreshToken = req.cookies.refreshToken;

    // Trường hợp 1: Không tìm thấy token trong cookie
    if (!refreshToken) {
      // Vẫn nên xóa cookie để đảm bảo
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
      });
      res.status(401).json({ message: "Không tìm thấy Refresh Token" });
      return;
    }

    // Tìm token trong database
    const tokenRecord = await RefreshToken.findOne({
      where: { token: refreshToken },
      include: [
        {
          model: Users,
          as: "user",
          attributes: ["id", "username", "roleId"],
        },
      ],
    });

    // Trường hợp 2: Token không tìm thấy trong database
    if (!tokenRecord) {
      // Xóa cookie vì token không hợp lệ
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
      });
      res.status(401).json({ message: "Refresh Token không hợp lệ" });
      return;
    }

    // Xác thực Refresh Token
    try {
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET as string
      ) as JwtPayload;

      // Tạo access token mới
      const accessToken = jwt.sign(
        {
          id: decoded.id,
          role: decoded.role,
        },
        process.env.JWT_SECRET as string,
        { expiresIn: "15m" }
      );

      // Trả về access token mới
      res.status(200).json({
        message: "Token đã được làm mới",
        accessToken,
      });
    } catch (error) {
      // Token hết hạn hoặc không hợp lệ
      // Xóa token khỏi database
      await tokenRecord.destroy();

      // Xóa cookie
      res.clearCookie("refreshToken");

      res.status(401).json({ message: "Refresh Token hết hạn" });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Đăng ký tài khoản mới
 *
 * Quy trình:
 * 1. Kiểm tra email đã tồn tại chưa
 * 2. Mã hóa mật khẩu
 * 3. Tạo tài khoản mới trong database
 *
 * @param req - Request chứa thông tin đăng ký (email, password)
 * @param res - Response thông báo kết quả đăng ký
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Kiểm tra email đã tồn tại chưa
    const user = await Users.findOne({ where: { email } });
    if (user) {
      res.status(400).json({ message: "Email đã tồn tại" });
      return;
    }

    // Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10);

    // Tạo user mới
    await Users.create({
      email,
      password: hashedPassword,
    });

    res.status(201).json({ message: "Đăng ký thành công" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Đăng nhập vào hệ thống
 *
 * Quy trình:
 * 1. Kiểm tra thông tin đăng nhập
 * 2. Xác thực mật khẩu
 * 3. Kiểm tra trạng thái tài khoản
 * 4. Tạo access token và refresh token
 * 5. Lưu refresh token vào database và cookie
 *
 * @param req - Request chứa thông tin đăng nhập (email, password, rememberMe)
 * @param res - Response trả về access token
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, rememberMe } = req.body;

    const user = await Users.findOne({ where: { email } });
    if (!user) {
      res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
      return;
    }

    // Kiểm tra trạng thái tài khoản
    if (!user.isActive) {
      res.status(403).json({
        message:
          "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ với quản trị viên.",
      });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(400).json({ message: "Email hoặc mật khẩu không đúng" });
      return;
    }

    const refreshExpiration = rememberMe ? "30d" : "7d";

    const refreshMaxAge = rememberMe
      ? 30 * 24 * 60 * 60 * 1000 // 30 ngày
      : 7 * 24 * 60 * 60 * 1000; // 7 ngày

    const accessToken = jwt.sign(
      { id: user.id, role: user.roleId, username: user.username },
      process.env.JWT_SECRET as string,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      { id: user.id, role: user.roleId },
      process.env.JWT_REFRESH_SECRET as string,
      { expiresIn: refreshExpiration }
    );

    // tạo Refresh Token mới
    await RefreshToken.create({
      token: refreshToken,
      userId: user.id,
      roleId: user.roleId,
    });

    // Lưu Refresh Token vào cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      maxAge: refreshMaxAge,
      secure: process.env.NODE_ENV === "production", // Chỉ bật secure trong production
      sameSite: "lax", // Cần thiết cho các trình duyệt hiện đại
      path: "/", // Đảm bảo cookie có thể truy cập từ mọi đường dẫn
    });
    res.status(200).json({ message: "Đăng nhập thành công", accessToken });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Đăng xuất khỏi hệ thống
 *
 * Quy trình:
 * 1. Xóa refresh token từ cookie
 * 2. Xóa refresh token từ database
 * 3. Xử lý các trường hợp lỗi
 *
 * @param req - Request chứa refresh token trong cookie
 * @param res - Response thông báo kết quả đăng xuất
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      // Không có token trong cookie, vẫn xóa cookie để đảm bảo
      res.clearCookie("refreshToken", {
        httpOnly: true,
        path: "/",
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
      res.status(200).json({ message: "Đăng xuất thành công" });
      return;
    }

    // Kiểm tra token có tồn tại trong database không
    const storedToken = await RefreshToken.findOne({
      where: { token: refreshToken },
    });

    // Nếu token tồn tại trong database, xóa nó
    if (storedToken) {
      await RefreshToken.destroy({
        where: { token: refreshToken },
      });
    }

    // Luôn xóa cookie bất kể token có trong database hay không
    res.clearCookie("refreshToken", {
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    res.status(200).json({ message: "Đăng xuất thành công" });
  } catch (error: any) {
    console.error("Logout error:", error);
    // Vẫn cố gắng xóa cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    res.status(200).json({ message: "Đăng xuất thành công" });
  }
};

/**
 * Lấy thông tin người dùng hiện tại
 *
 * Quy trình:
 * 1. Kiểm tra thông tin người dùng từ token
 * 2. Lấy thông tin chi tiết từ database
 * 3. Bao gồm thông tin role và địa chỉ
 *
 * @param req - Request có chứa thông tin user từ middleware xác thực
 * @param res - Response trả về thông tin chi tiết người dùng
 */
export const getCurrentUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Không có thông tin người dùng" });
      return;
    }

    const user = await Users.findByPk(req.user.id, {
      attributes: { exclude: ["password"] },
      include: [
        {
          model: Role,
          as: "role",
          attributes: ["id", "name"],
        },
        {
          model: UserAddress,
          as: "addresses",
          order: [["isDefault", "DESC"]],
        },
      ],
    });

    if (!user) {
      res.status(404).json({ message: "Người dùng không tồn tại" });
      return;
    }

    res.status(200).json(user);
  } catch (error: any) {
    console.error("Error fetching user info:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Lấy thông tin người dùng theo ID (Chỉ dành cho Admin)
 *
 * Quy trình:
 * 1. Kiểm tra quyền admin
 * 2. Tìm thông tin người dùng theo ID
 * 3. Tính toán thống kê đơn hàng và chi tiêu
 * 4. Ẩn thông tin nhạy cảm nếu người dùng không phải admin
 *
 * @param req - Request chứa ID người dùng cần tìm
 * @param res - Response trả về thông tin chi tiết người dùng
 */
export const getUserById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await Users.findByPk(id, {
      attributes: {
        exclude: ["password"],
        include: [
          [
            Sequelize.literal(`(
              SELECT COUNT(*)
              FROM orders
              WHERE orders.userId = users.id
            )`),
            "totalOrders",
          ],
          [
            // tính tổng giá trị đơn hàng đã hoàn thành thay vì tổng tất cả đơn hàng
            Sequelize.literal(`(
              SELECT COALESCE(SUM(orders.total), 0)
              FROM orders
              WHERE orders.userId = Users.id AND orders.status = 'delivered'
            )`),
            "totalSpent",
          ],
        ],
      },
      include: [
        {
          model: Role,
          as: "role",
          attributes: ["id", "name"],
        },
        {
          model: UserAddress,
          as: "addresses",
        },
      ],
    });

    if (!user) {
      res.status(404).json({ message: "Người dùng không tồn tại" });
      return;
    }

    if (req.user?.role === 2) {
      // Ẩn một phần email và số điện thoại
      if (user.email) {
        // Ẩn một phần email chừa lại 4 ký tự đầu và 4 ký tự sau trước @
        // nếu dưới 10 thì chừa lại 4 ký tự cuối,
        // nếu như dưới 4 ký tự thì ẩn hết
        user.email = user.email.replace(
          /^(.{4})(.*)(@.*)$/,
          (match, p1, p2, p3) => {
            if (p1.length + p2.length < 10) {
              // Nếu phần trước @ có dưới 10 ký tự
              if (p1.length + p2.length <= 4) {
                // Nếu phần trước @ ngắn (≤ 4 ký tự), ẩn hết
                return `${"*".repeat(p1.length + p2.length)}${p3}`;
              } else {
                // Giữ 4 ký tự cuối trước @
                return `${"*".repeat(p1.length + p2.length - 4)}${p2.slice(
                  -4
                )}${p3}`;
              }
            } else {
              // Giữ 4 ký tự đầu và 4 ký tự cuối trước @
              return `${p1}${"*".repeat(p2.length - 4)}${p2.slice(-4)}${p3}`;
            }
          }
        );
      }
      if (user.phoneNumber) {
        // nửa đầu của số điện thoại
        user.phoneNumber =
          user.phoneNumber.substring(0, 3) +
          "***" +
          // nửa sau của số điện thoại
          (user.phoneNumber.length > 6
            ? user.phoneNumber.substring(user.phoneNumber.length - 4)
            : "");
      }
    }

    res.status(200).json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Lấy danh sách tất cả người dùng (Chỉ dành cho Admin)
 *
 * Quy trình:
 * 1. Kiểm tra quyền admin
 * 2. Xử lý các tham số tìm kiếm và lọc
 * 3. Thực hiện phân trang
 * 4. Tính toán thống kê cho mỗi người dùng
 * 5. Ẩn thông tin nhạy cảm nếu cần
 *
 * @param req - Request chứa các tham số tìm kiếm, lọc và phân trang
 * @param res - Response trả về danh sách người dùng và thông tin phân trang
 */
export const getAllUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Sử dụng req.user từ middleware xác thực
    if (!req.user || (req.user.role !== 1 && req.user.role !== 2)) {
      res.status(403).json({ message: "Không có quyền truy cập" });
      return;
    }

    // thêm điều kiện để lấy tất cả người dùng
    const { search } = req.query;
    const whereCondition: any = search
      ? {
          [Op.or]: [
            { username: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } },
            { phoneNumber: { [Op.like]: `%${search}%` } },
            { roleId: { [Op.like]: `%${search}%` } },
          ],
        }
      : {};

    // thêm điều kiện nếu như có truyền vào status
    if (req.query.status === "active") {
      whereCondition.isActive = true; // hoặc 1
    } else if (req.query.status === "inactive") {
      whereCondition.isActive = false; // hoặc 0
    } else {
      whereCondition.isActive = { [Op.ne]: null }; // Lấy tất cả người dùng có trạng thái không null
    }

    // Phân trang
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const { count, rows: users } = await Users.findAndCountAll({
      where: whereCondition,
      attributes: {
        exclude: ["password"],
        include: [
          [
            Sequelize.literal(`(
        SELECT COUNT(*)
        FROM orders
        WHERE orders.userId = Users.id
      )`),
            "totalOrders",
          ],
          [
            Sequelize.literal(`(
        SELECT COALESCE(SUM(orders.total), 0)
        FROM orders
        WHERE orders.userId = Users.id AND orders.status = 'delivered'
      )`),
            "totalSpent",
          ],
        ],
      },
      include: [
        {
          model: Role,
          as: "role",
          attributes: ["id", "name"],
        },
      ],
      limit,
      offset,
      order: [["createdAt", "DESC"]],
      distinct: true,
    });

    // Kiểm tra nếu user hiện tại là employee (role 3), ẩn một phần thông tin nhạy cảm
    if (req.user?.role === 2) {
      users.forEach((user) => {
        // Ẩn một phần email
        user.email = user.email.replace(
          /^(.{4})(.*)(@.*)$/,
          (match, p1, p2, p3) => {
            if (p1.length + p2.length < 10) {
              // Nếu phần trước @ có dưới 10 ký tự
              if (p1.length + p2.length <= 4) {
                // Nếu phần trước @ ngắn (≤ 4 ký tự), ẩn hết
                return `${"*".repeat(p1.length + p2.length)}${p3}`;
              } else {
                // Giữ 4 ký tự cuối trước @
                return `${"*".repeat(p1.length + p2.length - 4)}${p2.slice(
                  -4
                )}${p3}`;
              }
            } else {
              // Giữ 4 ký tự đầu và 4 ký tự cuối trước @
              return `${p1}${"*".repeat(p2.length - 4)}${p2.slice(-4)}${p3}`;
            }
          }
        );

        // Ẩn một phần số điện thoại
        if (user.phoneNumber) {
          user.phoneNumber =
            user.phoneNumber.substring(0, 3) +
            "***" +
            (user.phoneNumber.length > 6
              ? user.phoneNumber.substring(user.phoneNumber.length - 4)
              : "");
        }
      });
    }

    res.status(200).json({
      users,
      pagination: {
        total: count,
        pages: Math.ceil(count / limit),
        currentPage: page,
        perPage: limit,
      },
    });
  } catch (error: any) {
    console.error("Error in getAllUsers:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Cập nhật thông tin người dùng
 *
 * Quy trình:
 * 1. Kiểm tra thông tin người dùng từ token
 * 2. Cập nhật thông tin người dùng trong database
 * 3. Trả về thông tin người dùng đã cập nhật
 *
 * @param req - Request chứa thông tin cần cập nhật
 * @param res - Response trả về thông tin người dùng đã cập nhật
 */
export const updateUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Không có thông tin người dùng" });
      return;
    }

    const userId = req.user.id;
    const { username, phoneNumber, dateOfBirth } = req.body;

    const user = await Users.findByPk(userId);
    if (!user) {
      res.status(404).json({ message: "Người dùng không tồn tại" });
      return;
    }

    // Update user information
    await user.update({
      username: username || user.getDataValue("username"),
      phoneNumber: phoneNumber,
      dateOfBirth: dateOfBirth,
    });

    // Return updated user without password
    const updatedUser = await Users.findByPk(userId, {
      attributes: { exclude: ["password"] },
    });

    res.status(200).json({
      message: "Cập nhật thông tin thành công",
      user: updatedUser,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Đổi mật khẩu
 *
 * Quy trình:
 * 1. Xác thực người dùng
 * 2. Kiểm tra mật khẩu hiện tại
 * 3. Cập nhật mật khẩu mới
 * 4. Đảm bảo mật khẩu mới khác mật khẩu cũ
 *
 * @param req - Request chứa mật khẩu hiện tại và mật khẩu mới
 * @param res - Response thông báo kết quả đổi mật khẩu
 */
export const changePassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Không được phép, vui lòng đăng nhập" });
      return;
    }

    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!currentPassword || !newPassword) {
      res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin" });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự" });
      return;
    }

    // Tìm người dùng trong database
    const user = await Users.findByPk(userId);
    if (!user) {
      res.status(404).json({ message: "Không tìm thấy người dùng" });
      return;
    }

    // Kiểm tra mật khẩu hiện tại
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isPasswordValid) {
      res.status(400).json({ message: "Mật khẩu hiện tại không đúng" });
      return;
    }

    // nếu mật khẩu mới giống mật khẩu cũ thì không cần cập nhật
    if (currentPassword === newPassword) {
      res
        .status(400)
        .json({ message: "Mật khẩu mới không được giống mật khẩu cũ" });
      return;
    }

    // Băm mật khẩu mới
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Cập nhật mật khẩu
    await user.update({ password: hashedPassword });

    res.status(200).json({ message: "Đổi mật khẩu thành công" });
  } catch (error: any) {
    console.error("Error changing password:", error);
    res
      .status(500)
      .json({ message: error.message || "Đã xảy ra lỗi khi đổi mật khẩu" });
  }
};

/**
 * Quên mật khẩu
 *
 * Quy trình:
 * 1. Nhận email từ người dùng
 * 2. Tìm người dùng theo email
 * 3. Tạo token đặt lại mật khẩu và lưu vào database
 * 4. Gửi email chứa liên kết đặt lại mật khẩu
 *
 * @param req - Request chứa email người dùng quên mật khẩu
 * @param res - Response thông báo kết quả
 */
export const forgotPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ message: "Email là bắt buộc" });
      return;
    }

    // Tìm người dùng theo email
    const user = await Users.findOne({ where: { email } });

    if (!user) {
      // Vì lý do bảo mật, không tiết lộ là email không tồn tại
      res.status(200).json({
        message:
          "Đã gửi hướng dẫn đặt lại mật khẩu nếu email tồn tại trong hệ thống",
      });
      return;
    }

    // Xóa các token reset cũ của user này
    await PasswordReset.destroy({ where: { userId: user.id } });

    // Tạo token ngẫu nhiên
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Thời gian hết hạn (1 giờ)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Lưu token vào database
    await PasswordReset.create({
      userId: user.id,
      token: resetToken,
      expiresAt,
    });

    // URL đặt lại mật khẩu
    const resetUrl = `${
      process.env.CLIENT_URL || "http://localhost:3000"
    }/reset-password/${resetToken}`;

    // Gửi email
    await sendEmail({
      to: email,
      subject: "Đặt lại mật khẩu",
      text: `Để đặt lại mật khẩu, vui lòng truy cập đường dẫn: ${resetUrl}. Đường dẫn này có hiệu lực trong 1 giờ.`,
      html: `
        <h1>Yêu cầu đặt lại mật khẩu</h1>
        <p>Chào bạn,</p>
        <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
        <p>Vui lòng nhấn vào nút bên dưới để đặt lại mật khẩu:</p>
        <a href="${resetUrl}" style="background-color:#4CAF50; color:white; padding:10px 15px; text-decoration:none; border-radius:5px; display:inline-block; margin:15px 0;">
          Đặt lại mật khẩu
        </a>
        <p>Đường dẫn này sẽ hết hạn sau 1 giờ.</p>
        <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
      `,
    });

    res.status(200).json({
      message: "Nếu email tồn tại, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu",
    });
  } catch (error: any) {
    console.error("Lỗi quên mật khẩu:", error);
    res.status(500).json({
      message: "Đã có lỗi xảy ra khi xử lý yêu cầu đặt lại mật khẩu",
    });
  }
};

/**
 * Kiểm tra token đặt lại mật khẩu
 *
 * @param req - Request chứa token đặt lại mật khẩu
 * @param res - Response thông báo kết quả kiểm tra
 */
export const validateResetToken = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { token } = req.params;

    // Kiểm tra token có tồn tại và còn hiệu lực
    const resetRecord = await PasswordReset.findOne({
      where: {
        token,
        expiresAt: {
          [Op.gt]: new Date(), // Token chưa hết hạn
        },
      },
    });

    if (!resetRecord) {
      res.status(400).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
      return;
    }

    res.status(200).json({ message: "Token hợp lệ" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Đặt lại mật khẩu
 *
 * Quy trình:
 * 1. Xác thực token và kiểm tra hạn
 * 2. Kiểm tra độ mạnh của mật khẩu mới
 * 3. Cập nhật mật khẩu và xóa token
 * 4. Đăng xuất khỏi tất cả thiết bị
 *
 * @param req - Request chứa token và mật khẩu mới
 * @param res - Response thông báo kết quả đặt lại mật khẩu
 */
export const resetPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      res.status(400).json({ message: "Mật khẩu phải có ít nhất 6 ký tự" });
      return;
    }

    // Kiểm tra token có tồn tại và còn hiệu lực
    const resetRecord = await PasswordReset.findOne({
      where: {
        token,
        expiresAt: {
          [Op.gt]: new Date(), // Token chưa hết hạn
        },
      },
    });

    if (!resetRecord) {
      res.status(400).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
      return;
    }

    // Lấy thông tin người dùng để cập nhật mật khẩu
    const user = await Users.findByPk(resetRecord.userId);
    if (!user) {
      res.status(404).json({ message: "Không tìm thấy người dùng" });
      return;
    }

    // Mã hóa mật khẩu mới
    const hashedPassword = await bcrypt.hash(password, 10);

    // Cập nhật mật khẩu
    await user.update({ password: hashedPassword });

    // Xóa token đã sử dụng
    await resetRecord.destroy();

    // Xóa tất cả refresh tokens của người dùng này (đăng xuất khỏi tất cả thiết bị)
    await RefreshToken.destroy({ where: { userId: user.id } });

    res.status(200).json({ message: "Đặt lại mật khẩu thành công" });
  } catch (error: any) {
    console.error("Lỗi đặt lại mật khẩu:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Khóa/Mở khóa tài khoản người dùng (Admin only)
 *
 * Quy trình:
 * 1. Kiểm tra quyền admin
 * 2. Tìm người dùng theo ID
 * 3. Đảo ngược trạng thái tài khoản
 * 4. Xóa refresh tokens nếu tài khoản bị khóa
 *
 * @param req - Request chứa ID người dùng cần khóa/mở khóa
 * @param res - Response thông báo kết quả
 */
export const toggleUserStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Kiểm tra quyền admin
    if (!req.user || req.user.role !== 1) {
      res.status(403).json({ message: "Không có quyền truy cập" });
      return;
    }

    const userId = parseInt(req.params.id);

    // Tìm người dùng
    const user = await Users.findByPk(userId);
    if (!user) {
      res.status(404).json({ message: "Không tìm thấy người dùng" });
      return;
    }

    // Không cho phép khóa tài khoản admin
    if (user.roleId === 1) {
      res
        .status(403)
        .json({ message: "Không thể khóa tài khoản quản trị viên" });
      return;
    }

    // Đảo ngược trạng thái
    const newStatus = !user.isActive;
    await user.update({ isActive: newStatus });

    // Nếu đang khóa tài khoản, xóa tất cả refresh tokens để đăng xuất khỏi tất cả thiết bị
    if (newStatus === false) {
      await RefreshToken.destroy({ where: { userId: user.id } });
    }

    res.status(200).json({
      message: `Tài khoản đã được ${newStatus ? "mở khóa" : "khóa"} thành công`,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        isActive: user.isActive,
      },
    });
  } catch (error: any) {
    console.error("Error toggling user status:", error);
    res.status(500).json({ message: error.message || "Đã xảy ra lỗi" });
  }
};

/**
 * update thông tin người dùng (admin only)
 *
 * Quy trình:
 * 1. Kiểm tra quyền admin
 * 2. Xác thực dữ liệu đầu vào
 * 3. Cập nhật thông tin người dùng trong database
 * 4. Trả về thông tin người dùng đã cập nhật
 *
 * @param req - Request chứa ID người dùng và thông tin cần cập nhật
 * @param res - Response trả về thông tin người dùng đã cập nhật
 */
export const updateUserByAdmin = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Kiểm tra quyền admin
    if (!req.user || req.user.role !== 1) {
      res.status(403).json({ message: "Không có quyền truy cập" });
      return;
    }

    const userId = parseInt(req.params.id);
    const { username, phoneNumber, dateOfBirth } = req.body;

    // validate dữ liệu đầu vào

    if (!username) {
      res.status(400).json({ message: "Tên người dùng là bắt buộc" });
      return;
    }
    // kiểm tra sdt có hợp lệ hay không
    // Số điện thoại từ 10 đến 15 chữ số
    // Regex cho số điện thoại Việt Nam
    const phoneRegex = /^(0[3|5|7|8|9]|[1-9][0-9])[0-9]{8,14}$/;
    if (phoneNumber && !phoneRegex.test(phoneNumber)) {
      res.status(400).json({
        message:
          "Số điện thoại không hợp lệ, Số điện thoại từ 10-15 chữ số, đúng định dạng 0xx-xxx-xxxx",
      });
      return;
    }

    // Tìm người dùng
    const user = await Users.findByPk(userId);
    if (!user) {
      res.status(404).json({ message: "Không tìm thấy người dùng" });
      return;
    }

    // Cập nhật thông tin người dùng
    await user.update({
      username,
      phoneNumber,
      dateOfBirth,
    });

    res.status(200).json({
      message: "Cập nhật thông tin thành công",
      user: {
        id: user.id,
        username: user.username,
        phoneNumber: user.phoneNumber,
        dateOfBirth: user.dateOfBirth,
      },
    });
  } catch (error: any) {
    console.error("Error updating user by admin:", error);
    res.status(500).json({ message: error.message || "Đã xảy ra lỗi" });
  }
};
