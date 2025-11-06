import { Request, Response } from "express";
import NavigationMenu from "../models/NavigationMenu";
import Category from "../models/Category";
import slugify from "slugify";

// Lấy menu cho frontend hiển thị
/**
 * Lấy danh sách menu điều hướng cho frontend hiển thị
 * Flow:
 * Step 1: Truy vấn database lấy tất cả menu có trạng thái active
 * Step 2: Sắp xếp menu theo thứ tự và cha con
 * Step 3: Kèm theo thông tin danh mục liên quan
 * Step 4: Xây dựng cấu trúc cây menu
 * Step 5: Trả về cấu trúc menu hoàn chỉnh
 */
export const getPublicNavigationMenu = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Step 1: Truy vấn database lấy tất cả menu có trạng thái active
    // Step 2: Sắp xếp menu theo thứ tự và cha con
    // Step 3: Kèm theo thông tin danh mục liên quan
    const menuItems = await NavigationMenu.findAll({
      where: { isActive: true },
      order: [
        ["parentId", "ASC"],
        ["order", "ASC"],
      ],
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["id", "name", "slug", "image"],
        },
      ],
    });

    // Step 4: Xây dựng cấu trúc cây menu
    const menuTree = buildMenuTree(menuItems);

    // Step 5: Trả về cấu trúc menu hoàn chỉnh
    res.json(menuTree);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy menu", error });
  }
};

// Các API cho admin quản lý
/**
 * Lấy tất cả menu điều hướng cho admin quản lý
 * Flow:
 * Step 1: Truy vấn database lấy tất cả menu
 * Step 2: Sắp xếp menu theo thứ tự và cha con
 * Step 3: Kèm theo thông tin danh mục liên quan
 * Step 4: Trả về danh sách menu
 */
export const getAllNavigationMenus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Step 1: Truy vấn database lấy tất cả menu
    // Step 2: Sắp xếp menu theo thứ tự và cha con
    // Step 3: Kèm theo thông tin danh mục liên quan
    const menuItems = await NavigationMenu.findAll({
      order: [
        ["parentId", "ASC"],
        ["order", "ASC"],
      ],
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["id", "name", "slug"],
        },
      ],
    });

    // Step 4: Trả về danh sách menu
    res.json(menuItems);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy danh sách menu", error });
  }
};

/**
 * Tạo mới một menu điều hướng
 * Flow:
 * Step 1: Lấy thông tin từ request body
 * Step 2: Tạo slug từ tên menu
 * Step 3: Tạo mới menu trong database
 * Step 4: Trả về thông tin menu đã tạo
 */
export const createNavigationMenu = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Step 1: Lấy thông tin từ request body
    const { name, link, categoryId, parentId, order, isActive, megaMenu } =
      req.body;

    // Step 2: Tạo slug từ tên
    const slug = slugify(name, { lower: true });

    // Step 3: Tạo mới menu trong database
    const newMenu = await NavigationMenu.create({
      name,
      slug,
      link: link || null,
      categoryId: categoryId || null,
      parentId: parentId || null,
      order: order || 0,
      isActive: isActive === undefined ? true : isActive,
      megaMenu: megaMenu || false,
    });

    // Step 4: Trả về thông tin menu đã tạo
    res.status(201).json(newMenu);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi tạo menu", error });
  }
};

/**
 * Cập nhật thông tin menu điều hướng
 * Flow:
 * Step 1: Lấy ID menu từ params request
 * Step 2: Tìm kiếm menu theo ID
 * Step 3: Kiểm tra nếu không tìm thấy menu
 * Step 4: Lấy thông tin cập nhật từ request body
 * Step 5: Tạo slug mới nếu tên thay đổi
 * Step 6: Cập nhật thông tin menu vào database
 * Step 7: Trả về thông báo cập nhật thành công
 */
export const updateNavigationMenu = async (
  req: Request,
  res: Response
): Promise<void> => {
  // Step 1: Lấy ID menu từ params request
  const { id } = req.params;
  try {
    // Step 2: Tìm kiếm menu theo ID
    const menu = await NavigationMenu.findByPk(id);

    // Step 3: Kiểm tra nếu không tìm thấy menu
    if (!menu) {
      res.status(404).json({ message: "Không tìm thấy menu" });
      return;
    }

    // Step 4: Lấy thông tin cập nhật từ request body
    const { name, link, categoryId, parentId, order, isActive, megaMenu } =
      req.body;

    // Step 5: Tạo slug mới nếu tên thay đổi
    let slug = menu.slug;
    if (name && name !== menu.name) {
      slug = slugify(name, { lower: true });
    }

    // Step 6: Cập nhật thông tin menu vào database
    await menu.update({
      name: name || menu.name,
      slug,
      link: link === undefined ? menu.link : link,
      categoryId: categoryId === undefined ? menu.categoryId : categoryId,
      parentId: parentId === undefined ? menu.parentId : parentId,
      order: order === undefined ? menu.order : order,
      isActive: isActive === undefined ? menu.isActive : isActive,
      megaMenu: megaMenu === undefined ? menu.megaMenu : megaMenu,
    });

    // Step 7: Trả về thông báo cập nhật thành công
    res.status(200).json({ message: "Navigation menu updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi cập nhật menu", error });
  }
};

/**
 * Xóa menu điều hướng
 * Flow:
 * Step 1: Lấy ID menu từ params request
 * Step 2: Tìm kiếm menu theo ID
 * Step 3: Kiểm tra nếu không tìm thấy menu
 * Step 4: Kiểm tra xem menu có menu con không
 * Step 5: Nếu có menu con, không cho phép xóa
 * Step 6: Xóa menu khỏi database
 * Step 7: Trả về thông báo xóa thành công
 */
export const deleteNavigationMenu = async (
  req: Request,
  res: Response
): Promise<void> => {
  // Step 1: Lấy ID menu từ params request
  const { id } = req.params;
  try {
    // Step 2: Tìm kiếm menu theo ID
    const menu = await NavigationMenu.findByPk(id);

    // Step 3: Kiểm tra nếu không tìm thấy menu
    if (!menu) {
      res.status(404).json({ message: "Không tìm thấy menu" });
      return;
    }

    // Step 4: Kiểm tra xem menu có menu con không
    const childMenus = await NavigationMenu.findAll({
      where: { parentId: id },
    });

    // Step 5: Nếu có menu con, không cho phép xóa
    if (childMenus.length > 0) {
      res.status(400).json({
        message: "Không thể xóa menu có menu con. Vui lòng xóa menu con trước.",
      });
      return;
    }

    // Step 6: Xóa menu khỏi database
    await menu.destroy();

    // Step 7: Trả về thông báo xóa thành công
    res.status(200).json({ message: "Đã xóa menu thành công" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi xóa menu", error });
  }
};

// Hàm hỗ trợ tạo cấu trúc menu dạng cây
/**
 * Hàm đệ quy xây dựng cấu trúc cây cho menu điều hướng
 * Flow:
 * Step 1: Lọc các menu có parentId trùng với tham số đầu vào
 * Step 2: Đệ quy gọi lại hàm cho từng menu con
 * Step 3: Chuyển đổi dữ liệu menu sang dạng JSON
 * Step 4: Thêm mảng children nếu có menu con
 * Step 5: Trả về cấu trúc cây hoàn chỉnh
 *
 * @param menuItems Mảng tất cả các menu
 * @param parentId ID của menu cha (hoặc null cho menu cấp cao nhất)
 * @returns Mảng menu đã được tổ chức thành cấu trúc cây
 */
function buildMenuTree(
  menuItems: any[],
  parentId: number | null = null
): Array<{ [key: string]: any; children?: any[] }> {
  // Step 1: Lọc các menu có parentId trùng với tham số đầu vào
  const items = menuItems.filter((menu) => menu.parentId === parentId);

  return items.map((item) => {
    // Step 2: Đệ quy gọi lại hàm cho từng menu con
    const children = buildMenuTree(menuItems, item.id);

    // Step 3: Chuyển đổi dữ liệu menu sang dạng JSON
    const itemJson = item.toJSON();

    // Step 4: Thêm mảng children nếu có menu con
    return {
      ...itemJson,
      children: children.length > 0 ? children : undefined,
    };
  });
}
