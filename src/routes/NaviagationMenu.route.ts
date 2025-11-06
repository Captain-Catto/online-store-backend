import { Router } from "express";
import {
  getPublicNavigationMenu,
  getAllNavigationMenus,
  createNavigationMenu,
  updateNavigationMenu,
  deleteNavigationMenu,
} from "../controllers/NavigationMenu.controller";
import { authMiddleware } from "../middlewares/authMiddleware";
import { roleMiddleware } from "../middlewares/roleMiddleware";

const router = Router();

// Route công khai cho frontend
router.get("/public", getPublicNavigationMenu);

// Routes cho admin
router.get("/", authMiddleware, roleMiddleware([1]), getAllNavigationMenus);
router.post("/", authMiddleware, roleMiddleware([1]), createNavigationMenu);
router.put("/:id", authMiddleware, roleMiddleware([1]), updateNavigationMenu);
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware([1]),
  deleteNavigationMenu
);

export default router;
