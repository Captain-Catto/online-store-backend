import { Request, Response } from "express";
import AdminMenuItem from "../models/AdminMenuItem.model";
import { literal, Op } from "sequelize";
import sequelize from "../config/db";

/**
 * Lấy menu admin theo quyền của user
 * Flow:
 * 1. Kiểm tra authentication - có user role không?
 * 2. Phân quyền theo role:
 *    - Admin (role = 1): Lấy tất cả menu items
 *    - Employee (role = 2): Chỉ lấy menu liên quan user, order, product
 *    - Role khác: Từ chối quyền truy cập
 * 3. Sắp xếp menu theo thứ tự hiển thị
 * 4. Trả về kết quả
 */
export const getAdminMenu = async (req: Request, res: Response) => {
  try {
    // Step 1: Lấy role của user từ middleware authentication
    const userRole = req.user?.role;

    // Step 2: Kiểm tra xem user đã đăng nhập chưa
    if (!userRole) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    let menuItems;

    // Step 3: Phân quyền theo role
    if (userRole === 1) {
      // Admin: Có toàn quyền truy cập tất cả menu
      menuItems = await AdminMenuItem.findAll({
        order: [
          // Sắp xếp: menu cha trước (parentId = null), sau đó theo parentId, cuối cùng theo displayOrder
          [literal("ISNULL(`parentId`)"), "DESC"], // Menu cha (parentId = null) lên đầu
          ["parentId", "ASC"], // Nhóm theo menu cha
          ["displayOrder", "ASC"], // Sắp xếp theo thứ tự hiển thị
        ],
        raw: true, // Trả về object JavaScript thuần thay vì Sequelize instance
      });
    } else if (userRole === 2) {
      // Employee: Chỉ được truy cập menu liên quan đến user, order, product

      // Step 3a: Tìm các menu con có path chứa user, order, hoặc product
      const childMenus = await AdminMenuItem.findAll({
        where: {
          [Op.or]: [
            { path: { [Op.like]: "%user%" } }, // Menu liên quan user
            { path: { [Op.like]: "%order%" } }, // Menu liên quan order
            { path: { [Op.like]: "%product%" } }, // Menu liên quan product
          ],
        },
        raw: true,
      });

      // Step 3b: Lấy danh sách ID của các menu cha từ menu con đã tìm được
      const parentIds = [
        ...new Set(childMenus.map((item) => item.parentId).filter(Boolean)),
      ];

      // Step 3c: Lấy thông tin các menu cha (nếu có)
      const parentMenus = parentIds.length
        ? await AdminMenuItem.findAll({
            where: { id: parentIds },
            raw: true,
          })
        : [];

      // Step 3d: Gộp menu cha và menu con, sắp xếp theo displayOrder
      menuItems = [...parentMenus, ...childMenus].sort(
        (a, b) => a.displayOrder - b.displayOrder
      );
    } else {
      // Role khác: Từ chối quyền truy cập
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    // Step 4: Trả về kết quả menu
    res.json(menuItems);
  } catch (error) {
    console.error("Error fetching admin menu:", error);
    res.status(500).json({ message: "Failed to fetch admin menu" });
  }
};

/**
 * Lấy tất cả menu items dạng phẳng (flat) để quản lý
 * Flow:
 * 1. Truy vấn tất cả menu items trong database
 * 2. Sắp xếp theo thứ tự: menu cha trước, sau đó theo parentId và displayOrder
 * 3. Trả về dạng object JavaScript thuần (raw: true)
 * Mục đích: Dành cho trang quản lý menu ở admin panel
 */
// Lấy tất cả menu items (dạng phẳng để quản lý)
export const getAllAdminMenuItemsFlat = async (req: Request, res: Response) => {
  try {
    // Step 1: Lấy tất cả menu items từ database
    const menuItems = await AdminMenuItem.findAll({
      order: [
        // Sắp xếp logic:
        [literal("ISNULL(`parentId`)"), "DESC"], // Menu cha (parentId = null) lên đầu
        ["parentId", "ASC"], // Nhóm các menu con theo menu cha
        ["displayOrder", "ASC"], // Sắp xếp theo thứ tự hiển thị
      ],
      raw: true, // Trả về dạng object JavaScript thuần, không phải Sequelize instance
    });

    // Step 2: Trả về kết quả, nếu không có data thì trả về mảng rỗng
    res.json(menuItems || []);
  } catch (error) {
    console.error("Error fetching all admin menu items:", error);
    res.status(500).json({ message: "Failed to fetch menu items" });
  }
};

/**
 * Tạo menu item mới
 * Flow:
 * 1. Lấy dữ liệu từ request body
 * 2. Validate các field bắt buộc (title, path, icon)
 * 3. Xử lý parentId (null nếu là menu cha, number nếu là menu con)
 * 4. Tạo menu item mới trong database
 * 5. Trả về menu item vừa tạo
 */
export const createAdminMenuItem = async (req: Request, res: Response) => {
  try {
    // Step 1: Lấy dữ liệu từ request body
    const { title, path, icon, parentId, displayOrder } = req.body;

    // Step 2: Validation các field bắt buộc
    if (!title || !path || !icon) {
      res.status(400).json({ message: "Title, Path, and Icon are required" });
      return;
    }

    // Step 3: Xử lý parentId - chuyển về null nếu không có hoặc chuyển sang number
    const validParentId = parentId ? Number(parentId) : null;

    // Step 4: Tạo menu item mới trong database
    const newItem = await AdminMenuItem.create({
      title,
      path,
      icon,
      parentId: validParentId,
      displayOrder: displayOrder || 0, // Mặc định displayOrder = 0 nếu không có
    });

    // Step 5: Trả về menu item vừa tạo với status 201 (Created)
    res.status(201).json(newItem);
  } catch (error) {
    console.error("Error creating admin menu item:", error);
    res.status(500).json({ message: "Failed to create menu item" });
  }
};

/**
 * Cập nhật menu item
 * Flow:
 * 1. Lấy ID menu item từ params và dữ liệu cập nhật từ body
 * 2. Kiểm tra menu item có tồn tại không
 * 3. Validate parentId (không được set chính nó làm parent)
 * 4. Cập nhật các field trong database
 * 5. Trả về menu item đã được cập nhật
 */
export const updateAdminMenuItem = async (req: Request, res: Response) => {
  try {
    // Step 1: Lấy ID từ params và dữ liệu từ body
    const { id } = req.params;
    const { title, path, icon, parentId, displayOrder } = req.body;

    // Step 2: Kiểm tra menu item có tồn tại không
    const item = await AdminMenuItem.findByPk(id);
    if (!item) {
      res.status(404).json({ message: "Menu item not found" });
      return;
    }

    // Step 3: Xử lý và validate parentId
    const validParentId = parentId ? Number(parentId) : null;

    // Ngăn chặn việc set chính nó làm parent (tránh circular reference)
    if (validParentId === Number(id)) {
      res.status(400).json({ message: "Cannot set item as its own parent" });
      return;
    }

    // Step 4: Cập nhật menu item với dữ liệu mới
    await item.update({
      title: title ?? item.title, // Giữ nguyên nếu không có giá trị mới
      path: path ?? item.path, // Giữ nguyên nếu không có giá trị mới
      icon: icon ?? item.icon, // Giữ nguyên nếu không có giá trị mới
      parentId: validParentId !== undefined ? validParentId : item.parentId, // Chỉ update nếu có giá trị
      displayOrder: displayOrder ?? item.displayOrder, // Giữ nguyên nếu không có giá trị mới
    });

    // Step 5: Trả về menu item đã được cập nhật
    res.json(item);
  } catch (error) {
    console.error("Error updating admin menu item:", error);
    res.status(500).json({ message: "Failed to update menu item" });
  }
};

/**
 * Xóa menu item
 * Flow:
 * 1. Lấy ID menu item từ params
 * 2. Kiểm tra menu item có tồn tại không
 * 3. Kiểm tra menu item có menu con không (không được xóa menu cha khi còn menu con)
 * 4. Xóa menu item khỏi database
 * 5. Trả về status 204 (No Content)
 */
export const deleteAdminMenuItem = async (req: Request, res: Response) => {
  try {
    // Step 1: Lấy ID từ params
    const { id } = req.params;

    // Step 2: Kiểm tra menu item có tồn tại không
    const item = await AdminMenuItem.findByPk(id);
    if (!item) {
      res.status(404).json({ message: "Menu item not found" });
      return;
    }

    // Step 3: Kiểm tra xem menu item này có menu con không
    const children = await AdminMenuItem.count({ where: { parentId: id } });
    if (children > 0) {
      // Không được xóa menu cha khi còn menu con
      res.status(400).json({
        message:
          "Cannot delete item with children. Please delete or reassign children first.",
      });
      return;
    }

    // Step 4: Xóa menu item khỏi database
    await item.destroy();

    // Step 5: Trả về status 204 (No Content) - xóa thành công
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting admin menu item:", error);
    res.status(500).json({ message: "Failed to delete menu item" });
  }
};

/**
 * Cập nhật thứ tự hiển thị của menu items
 * Flow:
 * 1. Lấy danh sách items từ request body
 * 2. Validate dữ liệu đầu vào (phải là array)
 * 3. Sử dụng database transaction để đảm bảo tính toàn vẹn
 * 4. Cập nhật displayOrder cho từng item
 * 5. Commit transaction và trả về kết quả
 * Mục đích: Cho phép admin drag & drop để sắp xếp lại thứ tự menu
 */
export const updateMenuOrder = async (req: Request, res: Response) => {
  try {
    // Step 1: Lấy danh sách items từ request body
    const { items } = req.body;

    // Step 2: Validate dữ liệu đầu vào
    if (!items || !Array.isArray(items)) {
      res
        .status(400)
        .json({ message: "Invalid input data - items must be an array" });
      return;
    }

    // Step 3: Sử dụng transaction để đảm bảo tính nhất quán dữ liệu
    // Nếu có lỗi xảy ra, tất cả thay đổi sẽ được rollback
    await sequelize.transaction(async (t) => {
      // Step 4: Cập nhật displayOrder cho từng item trong danh sách
      for (const item of items) {
        await AdminMenuItem.update(
          { displayOrder: item.displayOrder }, // Set displayOrder mới
          {
            where: { id: item.id }, // Điều kiện: tìm theo ID
            transaction: t, // Sử dụng transaction
          }
        );
      }
    });

    // Step 5: Trả về kết quả thành công
    res.json({ message: "Menu order đã được update thành công" });
  } catch (error) {
    console.error("Error updating menu order:", error);
    res.status(500).json({ message: "Menu order update thất bại" });
  }
};
