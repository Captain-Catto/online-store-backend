import { DataTypes, Model } from "sequelize";
import sequelize from "../config/db";
import Product from "./Product";
import Suitability from "./Suitability";

class ProductSuitability extends Model {
  public productId!: number;
  public suitabilityId!: number;
}

ProductSuitability.init(
  {
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "products",
        key: "id",
      },
      primaryKey: true,
    },
    suitabilityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "suitabilities",
        key: "id",
      },
      primaryKey: true,
    },
  },
  {
    sequelize,
    modelName: "ProductSuitability",
    tableName: "product_suitabilities",
    timestamps: true,
  }
);

export default ProductSuitability;
