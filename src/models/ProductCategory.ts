import { DataTypes, Model } from "sequelize";
import sequelize from "../config/db";
import Product from "./Product";
import Category from "./Category";

class ProductCategory extends Model {}

ProductCategory.init(
  {
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Product, key: "id" },
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: "categories", key: "id" },
    },
  },
  {
    sequelize,
    modelName: "ProductCategory",
    tableName: "product_categories",
    timestamps: false,
  }
);

export default ProductCategory;
