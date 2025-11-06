import { DataTypes, Model } from "sequelize";
import sequelize from "../config/db";

class Voucher extends Model {
  public id!: number;
  public code!: string;
  public type!: string;
  public value!: number;
  public expirationDate!: Date;
  public minOrderValue!: number;
  public description!: string;
  public status!: string;
  public usageLimit!: number;
  public usageCount!: number;
}

Voucher.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    type: {
      // Loại giảm giá: phần trăm hoặc cố định
      type: DataTypes.ENUM("percentage", "fixed"),
      allowNull: false,
    },
    value: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    minOrderValue: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    expirationDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("active", "inactive", "expired"),
      allowNull: false,
      defaultValue: "active",
    },
    usageLimit: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0, // 0 = không giới hạn
    },
    usageCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: "Voucher",
    tableName: "vouchers",
  }
);

export default Voucher;
