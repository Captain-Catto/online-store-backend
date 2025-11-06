import { DataTypes, Model, Op } from "sequelize";
import sequelize from "../config/db";

class Suitability extends Model {
  public id!: number;
  public name!: string;
  public slug!: string;
  public description?: string;
  public sortOrder?: number;

  // Method kiểm tra slug đã tồn tại chưa
  static async isSlugExists(
    slug: string,
    excludeId?: number
  ): Promise<boolean> {
    const where: any = { slug };
    if (excludeId) {
      where.id = { [Op.ne]: excludeId };
    }
    const count = await this.count({ where });
    return count > 0;
  }
}

Suitability.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      // Bỏ ràng buộc unique để tránh vượt quá giới hạn index của MySQL
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: "Suitability",
    tableName: "suitabilities",
    timestamps: true,
    hooks: {
      beforeCreate: async (suitability: Suitability) => {
        if (await Suitability.isSlugExists(suitability.slug)) {
          throw new Error("Slug đã tồn tại");
        }
      },
      beforeUpdate: async (suitability: Suitability) => {
        if (await Suitability.isSlugExists(suitability.slug, suitability.id)) {
          throw new Error("Slug đã tồn tại");
        }
      },
    },
  }
);

export default Suitability;
