import { DataTypes, Model } from "sequelize";
import sequelize from "../config/db";
import ProductDetail from "./ProductDetail";

class ProductInventory extends Model {
  declare id: number;
  declare productDetailId: number;
  declare size: string;
  declare stock: number;
}

ProductInventory.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    productDetailId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: ProductDetail, key: "id" },
    },
    size: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
  },
  {
    sequelize,
    modelName: "ProductInventory",
    tableName: "product_inventories",
    indexes: [
      {
        unique: true,
        fields: ["productDetailId", "size"],
      },
    ],
  }
);

export default ProductInventory;
