import { DataTypes, Model } from "sequelize";
import sequelize from "../config/db";
import Order from "./Order";

// định nghĩa interface PaymentStatus
interface PaymentStatus {
  id: number;
  name: string;
  description?: string;
}

// khai báo class PaymentStatus kế thừa class Model
class PaymentStatus extends Model {
  public id!: number;
  public name!: string;
  public description?: string;
}

// khai báo các trường của bảng PaymentStatus
PaymentStatus.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.ENUM(
        "Pending",
        "Paid",
        "Failed",
        "Refunded",
        "Cancelled"
      ),
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "PaymentStatus",
    tableName: "payment_statuses",
    timestamps: false,
  }
);

export default PaymentStatus;
