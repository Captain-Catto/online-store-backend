import { DataTypes, Model } from "sequelize";
import sequelize from "../config/db";
import Category from "./Category";

export class ProductSize extends Model {
  public id!: number;
  public value!: string;
  public displayName!: string;
  public categoryId!: number;
  public displayOrder!: number;
  public active!: boolean;
}

ProductSize.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    value: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    displayName: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Category,
        key: "id",
      },
    },
    displayOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: "product_sizes",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["value", "categoryId"],
        name: "value_category_unique",
      },
    ],
  }
);

export default ProductSize;
