import { DataTypes, Model } from "sequelize";
import sequelize from "../config/db";
import Users from "./Users";

// định nghĩa interface Role
interface Role {
  id: number;
  name: string;
}

// khai báo class Role kế thừa class Model
class Role extends Model {
  public id!: number;
  public name!: string;
}

// khai báo các trường của bảng Role
Role.init(
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
  },
  {
    sequelize,
    tableName: "roles",
    timestamps: false,
  }
);

// export class Role
export default Role;
