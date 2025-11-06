import { DataTypes, Model } from "sequelize";
import sequelize from "../config/db";
import Users from "./Users";

class RefreshToken extends Model {
  public id!: number;
  public token!: string;
  public userId!: number;
  public createdAt!: Date;
  public updatedAt!: Date;
}

RefreshToken.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    token: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Users, key: "id" },
    },
  },
  {
    sequelize,
    modelName: "RefreshToken",
    tableName: "refresh_tokens",
    timestamps: true,
  }
);

export default RefreshToken;
