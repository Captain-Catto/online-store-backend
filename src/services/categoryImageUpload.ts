import { S3Client } from "@aws-sdk/client-s3";
import multer from "multer";
import multerS3 from "multer-s3";
import { v4 as uuidv4 } from "uuid";

// Tái sử dụng S3Client từ imageUpload.ts
const s3 = new S3Client({
  region: process.env.AWS_REGION || "ap-southeast-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

// Cấu hình multer cho category images
export const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET || "",
    acl: "public-read",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const uniqueId = uuidv4().slice(0, 8);
      const cleanFileName = file.originalname
        .replace(/[^a-zA-Z0-9.]/g, "_")
        .toLowerCase();
      const fileName = `categories/${uniqueId}-${cleanFileName}`; // Thay đổi folder path thành categories
      cb(null, fileName);
    },
  }),
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Định dạng file không được hỗ trợ. Chỉ hỗ trợ JPEG, PNG, WEBP và GIF."
        )
      );
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
}).single("image");

// Hàm xóa file từ S3 (sử dụng nếu cần xóa ảnh cũ)
export const deleteFile = async (fileUrl: string): Promise<boolean> => {
  try {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");

    // Trích xuất key từ URL
    const urlParts = fileUrl.split("/");
    const key = urlParts.slice(3).join("/"); // Bỏ qua phần domain

    const command = new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET || "",
      Key: key,
    });

    await s3.send(command);
    return true;
  } catch (error) {
    console.error("Error deleting file from S3:", error);
    return false;
  }
};
