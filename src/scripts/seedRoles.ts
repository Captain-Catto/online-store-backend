import sequelize from "../config/db";

export const seedRoles = async () => {
  try {
    console.log("🌱 Bắt đầu seed roles...");

    // Tạo các role cơ bản
    await sequelize.query(`
      INSERT IGNORE INTO roles (id, name, description, createdAt, updatedAt) VALUES
      (1, 'Admin', 'Quản trị viên hệ thống', NOW(), NOW()),
      (2, 'Employee', 'Nhân viên', NOW(), NOW()),
      (3, 'Customer', 'Khách hàng', NOW(), NOW())
    `);

    console.log("✅ Seed roles thành công!");
  } catch (error) {
    console.error("❌ Lỗi khi seed roles:", error);
    throw error;
  }
};

export default seedRoles;
