import { DataTypes, Model } from "sequelize";
import sequelize from "../config/db";
import Users from "./Users";

class UserNote extends Model {
  public id!: number;
  public userId!: number;
  public note!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
}

UserNote.init(
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
    note: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "UserNote",
    tableName: "user_notes",
  }
);

export default UserNote;
