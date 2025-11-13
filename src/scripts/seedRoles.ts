import sequelize from "../config/db";

export const seedRoles = async () => {
  try {
    console.log("🌱 Bắt đầu seed roles...");

    // Tạo các role cơ bản (bỏ description vì bảng không có cột này)
    await sequelize.query(`
      INSERT IGNORE INTO roles (id, name, createdAt, updatedAt) VALUES
      (1, 'Admin', NOW(), NOW()),
      (2, 'Employee', NOW(), NOW()),
      (3, 'Customer', NOW(), NOW())
    `);

    console.log("✅ Seed roles thành công!");
  } catch (error) {
    console.error("❌ Lỗi khi seed roles:", error);
    throw error;
  }
};

export default seedRoles;
