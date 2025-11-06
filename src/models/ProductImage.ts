import { DataTypes, Model } from "sequelize";
import sequelize from "../config/db";
import ProductDetail from "./ProductDetail";

class ProductImage extends Model {
  public id!: number;
  public productDetailId!: number;
  public url!: string;
  public isMain!: boolean;
  public displayOrder!: number;
}

ProductImage.init(
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
    url: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    isMain: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    displayOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: "ProductImage",
    tableName: "product_images",
  }
);

export default ProductImage;
