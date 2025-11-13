import dotenv from "dotenv";
import seedClothingDataWithS3 from "./seedWithS3Images";

// Load environment variables
dotenv.config();

// Chạy seed script
const runSeed = async () => {
  try {
    console.log("🚀 Bắt đầu chạy seed script với hình ảnh S3...");
    console.log("⚠️  Đảm bảo bạn đã:");
    console.log("   1. Upload hình ảnh lên S3 bucket");
    console.log("   2. Cập nhật S3_BUCKET_URL trong seedWithS3Images.ts");
    console.log("   3. Cấu hình đúng database connection");
    console.log("");
    
    await seedClothingDataWithS3();
    
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