import { DataTypes, Model } from "sequelize";
import sequelize from "../config/db";
import Order from "./Order";

// định nghĩa interface PaymentMethod
interface PaymentMethod {
  id: number;
  name: string;
}

// khai báo class PaymentMethod kế thừa class Model
class PaymentMethod extends Model {
  public id!: number;
  public name!: string;
}

// khai báo các trường của bảng PaymentMethod
PaymentMethod.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.ENUM("COD", "Momo", "ZaloPay", "VNPAY"),
      allowNull: false,
      unique: true,
    },
  },
  {
    sequelize,
    modelName: "PaymentMethod",
    tableName: "payment_methods",
    timestamps: false,
  }
);

export default PaymentMethod;
