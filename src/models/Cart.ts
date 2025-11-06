import { Model, DataTypes } from "sequelize";
import sequelize from "../config/db";
import Users from "./Users";

class Cart extends Model {
  public id!: number;
  public userId!: number;
  public createdAt!: Date;
  public updatedAt!: Date;
}

Cart.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Users,
        key: "id",
      },
    },
  },
  {
    sequelize,
    tableName: "carts",
  }
);

export default Cart;
