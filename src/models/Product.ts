import { DataTypes, Model } from "sequelize";
import sequelize from "../config/db";
import ProductDetail from "./ProductDetail";
import Category from "./Category";
import Suitability from "./Suitability";

class Product extends Model {
  public id!: number;
  public name!: string;
  public sku!: string;
  public description!: string;
  public brand!: string;
  public material!: string;
  public featured!: boolean;
  public status!: string;
  public tags!: string;

  public readonly details?: ProductDetail[]; // Quan hệ với ProductDetail
  public readonly categories?: Category[]; // Quan hệ với Category
  public readonly suitabilities?: Suitability[]; // Quan hệ với Suitability
}

Product.init(
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
    sku: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    brand: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    material: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    featured: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    status: {
      type: DataTypes.ENUM("active", "outofstock", "draft"),
      allowNull: false,
      defaultValue: "draft",
    },
    tags: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: "[]",
      get() {
        const rawValue = this.getDataValue("tags");
        return rawValue ? JSON.parse(rawValue) : [];
      },
      set(value: string[]) {
        this.setDataValue("tags", JSON.stringify(value));
      },
    },
  },
  {
    sequelize,
    modelName: "Product",
    tableName: "products",
    timestamps: true,
  }
);

export default Product;
