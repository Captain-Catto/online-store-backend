import dotenv from "dotenv";
import seedRoles from "./seedRoles";
import seedDetailedClothingData from "./seedDetailedProducts";

// Load environment variables
dotenv.config();

// Chạy seed script
const runSeed = async () => {
  try {
    console.log("🚀 Bắt đầu chạy seed script...");
    console.log("");

    // 1. Seed roles trước
    await seedRoles();
    console.log("");

    // 2. Seed products với S3 images
    await seedDetailedClothingData();

    console.log("");
    console.log("🎉 Seed script hoàn thành thành công!");
    console.log("✅ Bạn có thể kiểm tra dữ liệu trong database và test API endpoints");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seed script thất bại:", error);
    process.exit(1);
  }
};

// Chạy script
runSeed();