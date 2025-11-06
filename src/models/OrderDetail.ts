import { Model, DataTypes } from "sequelize";
import sequelize from "../config/db";
import Order from "./Order";
import Product from "./Product";
import Voucher from "./Voucher";
import ProductDetail from "./ProductDetail";

class OrderDetail extends Model {
  public id!: number;
  public orderId!: number;
  public productId!: number;
  public productDetailId!: number;
  public quantity!: number;
  public color!: string;
  public size!: string;
  public originalPrice!: number;
  public discountPrice!: number;
  public discountPercent!: number;
  public voucherId!: number | null;
  public imageUrl!: string;
}

OrderDetail.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Order, key: "id" },
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Product, key: "id" },
    },
    productDetailId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: ProductDetail, key: "id" },
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    color: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    size: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    originalPrice: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    discountPrice: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    discountPercent: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100,
      },
    },
    voucherId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: Voucher, key: "id" },
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "OrderDetail",
    tableName: "order_details",
  }
);

export default OrderDetail;
