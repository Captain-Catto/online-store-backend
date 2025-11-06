import { DataTypes, Model } from "sequelize";
import sequelize from "../config/db";

class AdminMenuItem extends Model {
  public id!: number;
  public title!: string;
  public path!: string;
  public icon!: string;
  public parentId!: number | null;
  public displayOrder!: number;
  // Thêm các trường khác nếu cần: requiredRole, isActive, etc.
}

AdminMenuItem.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    title: { type: DataTypes.STRING, allowNull: false },
    path: { type: DataTypes.STRING, allowNull: false },
    icon: { type: DataTypes.STRING, allowNull: false },
    parentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: "admin_menu_items", key: "id" },
    }, // Tự tham chiếu
    displayOrder: { type: DataTypes.INTEGER, defaultValue: 0 },
    // requiredRole: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 }, // Ví dụ: 1 = Admin
    // isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  {
    sequelize,
    tableName: "admin_menu_items", // Tên bảng trong DB
    timestamps: true,
  }
);

export default AdminMenuItem;
