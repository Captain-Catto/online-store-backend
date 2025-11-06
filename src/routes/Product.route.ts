import { Router } from "express";
import {
  getProductsWithVariants,
  getProductById,
  createProductWithDetails,
  deleteProduct,
  getProductsByCategory,
  getSuitabilities,
  getSubtypes,
  getProductVariantsById,
  updateProductBasicInfo,
  updateProductInventory,
  addProductImages,
  removeProductImages,
  setMainProductImage,
  updateProductVariants,
  getProductBreadcrumb,
  searchProducts,
} from "../controllers/Product.controller";
import {
  getAllSizes,
  createSize,
  updateSize,
  deleteSize,
  getSizesByCategory,
} from "../controllers/ProductSizes.controller";
import { authMiddleware } from "../middlewares/authMiddleware";
import { roleMiddleware } from "../middlewares/roleMiddleware";
import { upload } from "../services/imageUpload";

const router = Router();

// Public routes
router.get("/", getProductsWithVariants);
router.get("/search", searchProducts);
router.get("/suitabilities", getSuitabilities);
router.get("/variants/:id", getProductVariantsById);
router.get("/category/:categoryId", getProductsByCategory);
router.get("/subtypes", getSubtypes);
router.get("/sizes", getAllSizes);
router.get("/by-category", getSizesByCategory);
router.get("/:id/breadcrumb", getProductBreadcrumb);
// luôn để route này ở dưới cùng vì khi để /subtypes thì nó đang hiểu là
// id = subtypes và ko tìm ra
router.get("/:id", getProductById);

// Protected routes
router.post(
  "/",
  authMiddleware,
  roleMiddleware([1]),
  upload.array("images", 50),
  createProductWithDetails
);
router.post("/sizes", authMiddleware, roleMiddleware([1]), createSize);
router.put("/sizes/:id", authMiddleware, roleMiddleware([1]), updateSize);
router.delete("/sizes/:id", authMiddleware, roleMiddleware([1]), deleteSize);
// Basic info
router.patch(
  "/:id/basic-info",
  authMiddleware,
  roleMiddleware([1, 2]),
  updateProductBasicInfo
);

// Inventory
router.patch(
  "/:id/inventory",
  authMiddleware,
  roleMiddleware([1, 2]),
  updateProductInventory
);

// Add images
router.post(
  "/:id/images",
  authMiddleware,
  roleMiddleware([1]),
  upload.array("images", 20),
  addProductImages
);

// Remove images
router.delete(
  "/:id/images",
  authMiddleware,
  roleMiddleware([1]),
  removeProductImages
);

// Set main image
router.patch(
  "/:id/images/:imageId/main",
  authMiddleware,
  roleMiddleware([1]),
  setMainProductImage
);

// cập nhật các thuộc tính của sản phẩm (size, color, ...)
router.patch(
  "/:id/variants",
  authMiddleware,
  roleMiddleware([1, 2]),
  updateProductVariants
);
router.delete("/:id", authMiddleware, roleMiddleware([1]), deleteProduct);

export default router;
