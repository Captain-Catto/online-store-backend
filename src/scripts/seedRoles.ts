import sequelize from "../config/db";

export const seedRoles = async () => {
  try {
    console.log("🌱 Bắt đầu seed roles...");

    // Bảng roles chỉ có id và name
    await sequelize.query(`
      INSERT IGNORE INTO roles (id, name) VALUES
      (1, 'Admin'),
      (2, 'Employee'),
      (3, 'Customer')
    `);

    console.log("✅ Seed roles thành công!");
  } catch (error) {
    console.error("❌ Lỗi khi seed roles:", error);
    throw error;
  }
};

export default seedRoles;
