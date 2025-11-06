import { DataTypes, Model } from "sequelize";
import sequelize from "../config/db";
import Users from "./Users";

class UserAddress extends Model {
  public id!: number;
  public userId!: number;
  public fullName!: string; // Tên người nhận
  public phoneNumber!: string; // Số điện thoại
  public streetAddress!: string; // Số nhà, tên đường
  public ward!: string; // Phường/Xã
  public district!: string; // Quận/Huyện
  public city!: string; // Tỉnh/Thành phố
  public isDefault!: boolean; // Địa chỉ mặc định
}

UserAddress.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Users, key: "id" },
    },
    fullName: {
      // cái này sẽ là tên của địa chỉ
      type: DataTypes.STRING,
      allowNull: false,
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    streetAddress: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    ward: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    district: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: "UserAddress",
    tableName: "user_addresses",
  }
);

export default UserAddress;
