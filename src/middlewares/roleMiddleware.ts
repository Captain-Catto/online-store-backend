import { Request, Response, NextFunction } from "express";

// Định nghĩa các permission chi tiết
export enum Permission {
  VIEW_USERS = "VIEW_USERS", // Xem danh sách users
  EDIT_USERS = "EDIT_USERS", // Sửa thông tin users
  TOGGLE_USER_STATUS = "TOGGLE_USER_STATUS", // Vô hiệu hóa/kích hoạt user
  VIEW_ORDERS = "VIEW_ORDERS", // Xem đơn hàng
  VIEW_FULL_ORDERS = "VIEW_FULL_ORDERS", // Xem đầy đủ thông tin đơn hàng
  MANAGE_ORDERS = "MANAGE_ORDERS", // Quản lý trạng thái đơn hàng
  VIEW_FULL_USER_INFO = "VIEW_FULL_USER_INFO", // Xem đầy đủ thông tin người dùng
  EDIT_USERS_ADDRESS = "EDIT_USERS_ADDRESS", // Sửa địa chỉ người dùng
}

// Ánh xạ role với các permission
const rolePermissions: Record<number, Permission[]> = {
  1: [
    // Admin - Full quyền
    Permission.VIEW_FULL_USER_INFO,
    Permission.EDIT_USERS,
    Permission.TOGGLE_USER_STATUS,
    Permission.VIEW_ORDERS,
    Permission.VIEW_FULL_ORDERS,
    Permission.MANAGE_ORDERS,
    Permission.VIEW_FULL_USER_INFO,
    Permission.EDIT_USERS_ADDRESS,
  ],
  2: [
    // Employee - Quyền hạn chế
    Permission.VIEW_USERS,
    Permission.VIEW_ORDERS,
    Permission.MANAGE_ORDERS,
    Permission.EDIT_USERS_ADDRESS,
  ],
  3: [], // User thông thường - Không có quyền admin
};

// Middleware kiểm tra role (giữ lại để tương thích với code cũ)
export const roleMiddleware = (allowedRoles: number[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      res.status(403).json({ message: "Không có quyền truy cập" });
      return;
    }

    next();
  };
};

// Middleware mới kiểm tra permission chi tiết
export const permissionMiddleware = (requiredPermissions: Permission[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;

    if (!userRole) {
      res.status(403).json({ message: "Không có quyền truy cập" });
      return;
    }

    const userPermissions = rolePermissions[userRole] || [];

    // Kiểm tra xem người dùng có tất cả permission cần thiết không
    const hasAllPermissions = requiredPermissions.every((permission) =>
      userPermissions.includes(permission)
    );

    if (!hasAllPermissions) {
      res
        .status(403)
        .json({ message: "Không đủ quyền thực hiện hành động này" });
      return;
    }

    next();
  };
};

// Helper function để kiểm tra quyền
export const hasPermission = (
  role: number,
  permission: Permission
): boolean => {
  const permissions = rolePermissions[role] || [];
  return permissions.includes(permission);
};
