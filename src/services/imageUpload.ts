import { Request } from "express";
import multer from "multer";
import { S3Client } from "@aws-sdk/client-s3";
import multerS3 from "multer-s3";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

dotenv.config();

// Kiểm tra biến môi trường
if (
  !process.env.AWS_ACCESS_KEY_ID ||
  !process.env.AWS_SECRET_ACCESS_KEY ||
  !process.env.AWS_REGION ||
  !process.env.S3_BUCKET
) {
  console.error("AWS S3 environment variables are missing!");
}

// Cấu hình S3 client
const s3 = new S3Client({
  region: process.env.AWS_REGION || "ap-southeast-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

// Cấu hình multer với multer-s3
const upload = multer({
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
      const fileName = `products/${uniqueId}-${cleanFileName}`;
      cb(null, fileName);
    },
  }),
  fileFilter: (
    req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ chấp nhận file ảnh (jpg, png, gif, webp)"));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// Xóa file từ S3
const deleteFile = async (fileUrl: string): Promise<boolean> => {
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

// Tạo URL công khai cho file
const getPublicUrl = (filename: string): string => {
  return `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${filename}`;
};

export { upload, getPublicUrl, deleteFile };
