import { Router } from "express";
import {
  createAddress,
  getUserAddresses,
  getAddressById,
  updateAddress,
  setDefaultAddress,
  deleteAddress,
  // Thêm các controllers mới cho admin
  getAddressesByUserId,
  getAddressByIdForAdmin,
  updateAddressByAdmin,
  createAddressByAdmin,
  deleteAddressByAdmin,
  setDefaultAddressByAdmin,
} from "../controllers/UserAddress.controller";
import { authMiddleware } from "../middlewares/authMiddleware";
import {
  permissionMiddleware,
  Permission,
} from "../middlewares/roleMiddleware";

const router = Router();

// Tất cả các routes đều cần authentication
router.use(authMiddleware);

// ROUTES CHO NGƯỜI DÙNG THÔNG THƯỜNG
// Get all addresses for current user
router.get("/", getUserAddresses);

// Get specific address
router.get("/:id", getAddressById);

// Create new address
router.post("/", createAddress);

// Update address
router.put("/:id", updateAddress);

// Set address as default
router.put("/:id/default", setDefaultAddress);

// Delete address
router.delete("/:id", deleteAddress);

// ROUTES CHO ADMIN
// Get all addresses for a specific user
router.get(
  "/admin/users/:userId/addresses",
  permissionMiddleware([Permission.VIEW_USERS, Permission.VIEW_FULL_USER_INFO]),
  getAddressesByUserId
);

// Get specific address for admin
router.get(
  "/admin/addresses/:id",
  permissionMiddleware([Permission.VIEW_USERS, Permission.VIEW_FULL_USER_INFO]),
  getAddressByIdForAdmin
);

// Create address for user by admin
router.post(
  "/admin/users/:userId/addresses",
  permissionMiddleware([Permission.EDIT_USERS_ADDRESS]),
  createAddressByAdmin
);

// Update address by admin
router.put(
  "/admin/addresses/:id",
  permissionMiddleware([Permission.EDIT_USERS_ADDRESS]),
  updateAddressByAdmin
);

// Set address as default by admin
router.put(
  "/admin/addresses/:id/default",
  permissionMiddleware([Permission.EDIT_USERS_ADDRESS]),
  setDefaultAddressByAdmin
);

// Delete address by admin
router.delete(
  "/admin/addresses/:id",
  permissionMiddleware([Permission.EDIT_USERS_ADDRESS]),
  deleteAddressByAdmin
);

export default router;
