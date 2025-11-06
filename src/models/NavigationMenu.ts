import { Model, DataTypes } from "sequelize";
import sequelize from "../config/db";

class NavigationMenu extends Model {
  public id!: number;
  public name!: string;
  public slug!: string;
  public link!: string | null;
  public categoryId!: number | null;
  public order!: number;
  public parentId!: number | null;
  public isActive!: boolean;
  public megaMenu!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

NavigationMenu.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    link: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "categories",
        key: "id",
      },
    },
    order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    parentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "navigation_menus",
        key: "id",
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    megaMenu: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: "navigation_menus",
  }
);

export default NavigationMenu;
