import { Model, DataTypes } from "sequelize";
import sequelize from "../config/db";
import Cart from "./Cart";
import Product from "./Product";
import ProductDetail from "./ProductDetail";

class CartItem extends Model {
  public id!: number;
  public cartId!: number;
  public productId!: number;
  public productDetailId!: number;
  public quantity!: number;
  public color!: string;
  public size!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
}

CartItem.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    cartId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Cart,
        key: "id",
      },
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Product,
        key: "id",
      },
    },
    productDetailId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: ProductDetail,
        key: "id",
      },
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    color: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    size: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: "cart_items",
  }
);

export default CartItem;
