import { Router } from "express";
import {
  getSummaryReport,
  getRevenueReport,
  getCategoryReport,
  getTopProductsReport,
  getLowStockProducts,
  getProductPerformance,
  getCategoryPerformance,
  getOrderAnalysis,
} from "../controllers/Reports.controller";

const router = Router();

// Route for summary report
router.get("/summary", getSummaryReport);

// Route for top products
router.get("/top-products", getTopProductsReport);

// Route for top categories
router.get("/top-categories", getCategoryReport);

// Route for revenue report
router.get("/revenue", getRevenueReport);

// Route for low stock products
router.get("/low-stock", getLowStockProducts);

// Route for product performance
router.get("/product-performance", getProductPerformance);

// Route for category performance
router.get("/category-performance", getCategoryPerformance);

// Route for order analysis
router.get("/order-analysis", getOrderAnalysis);

export default router;
