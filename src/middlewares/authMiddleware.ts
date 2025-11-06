import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Mở rộng interface Request để bao gồm user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        role: number;
        username: string;
      };
    }
  }
}
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Kiểm tra xem có header Authorization không
    const authHeader = req.headers.authorization;
    // Nếu không có header Authorization hoặc không phải Bearer token
    // thì trả về lỗi 401 Unauthorized
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Không tìm thấy token" });
      return; // Chỉ return không có giá trị
    }
    // Tách token ra khỏi header Authorization
    const token = authHeader.split(" ")[1];
    // Giải mã token bằng secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;

    // Đặt thông tin user vào req.user
    req.user = {
      id: decoded.id,
      role: decoded.role,
      username: decoded.username,
    };

    next(); // Gọi next() để tiếp tục middleware chain
  } catch (error) {
    res.status(401).json({ message: "Token không hợp lệ" });
    return; // Chỉ return không có giá trị
  }
};
