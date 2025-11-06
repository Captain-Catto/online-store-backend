import { Op } from "sequelize";
import { Request, Response } from "express";
import Order from "../models/Order";
import OrderDetail from "../models/OrderDetail";
import Product from "../models/Product";
import Category from "../models/Category";
import ProductDetail from "../models/ProductDetail";
import ProductInventory from "../models/ProductInventory";
import Suitability from "../models/Suitability";
import sequelize from "../config/db";
import PaymentMethod from "../models/PaymentMethod";

type LowStockProduct = {
  id: number;
  sku: string;
  name: string;
  category: string;
  stock: number;
  threshold: number;
  variants: Array<{
    detailId: number;
    size: string;
    color: string;
    stock: number;
    needsRestock: boolean;
  }>;
  totalVariants: number;
};

interface ProductSaleResult {
  productId: number;
  totalQuantity: string;
  totalRevenue: string;
}

/**
 * Lấy thống kê tổng quan cho bảng điều khiển
 *
 * Quy trình:
 * 1. Lấy và xử lý tham số khoảng thời gian
 * 2. Lấy dữ liệu đơn hàng đã hoàn thành trong khoảng thời gian
 * 3. Tính toán các chỉ số thống kê:
 *    - Tổng doanh thu
 *    - Tổng số đơn hàng
 *    - Giá trị đơn hàng trung bình
 *    - Tổng số sản phẩm
 *    - Số lượng sản phẩm tồn kho thấp
 *    - Danh mục bán chạy nhất
 * 4. Trả về kết quả thống kê
 *
 * @param req - Request chứa tham số khoảng thời gian (dateRange, fromDate, toDate)
 * @param res - Response trả về dữ liệu thống kê
 */
export const getSummaryReport = async (req: Request, res: Response) => {
  try {
    // Lấy tham số khoảng thời gian hoặc mặc định là 7 ngày gần nhất
    const { dateRange, fromDate, toDate } = req.query;
    console.log("dateRange", dateRange);
    // Tính toán khoảng thời gian
    let endDate = new Date();
    let startDate = new Date();

    if (fromDate && toDate && dateRange === "custom") {
      startDate = new Date(fromDate as string);
      endDate = new Date(toDate as string);
    } else {
      switch (dateRange) {
        case "week":
          startDate.setDate(endDate.getDate() - 7);
          break;
        case "month":
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case "quarter":
          startDate.setMonth(endDate.getMonth() - 3);
          break;
        case "year":
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(endDate.getDate() - 7);
      }
    } // Lấy tổng doanh thu từ các đơn hàng đã hoàn thành
    const orders = await Order.findAll({
      where: {
        createdAt: {
          [Op.between]: [startDate, endDate],
        },
        status: {
          // chỉ lấy đơn đã giao
          [Op.eq]: "delivered",
        },
      },
    }); // Tính tổng doanh thu
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);

    // Đếm tổng số đơn hàng
    const totalOrders = orders.length;

    // Tính giá trị đơn hàng trung bình
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Đếm tổng số sản phẩm
    const totalProducts = await Product.count(); // Lấy số lượng sản phẩm có tồn kho thấp (sản phẩm có tồn kho <= 10)
    const productDetails = await ProductDetail.findAll({
      include: [
        {
          model: ProductInventory,
          as: "inventories",
          where: {
            stock: {
              [Op.lte]: 10,
            },
          },
        },
      ],
    });

    const lowStockProducts = productDetails.length; // Lấy danh mục bán chạy nhất
    const orderDetails = await OrderDetail.findAll({
      where: {
        orderId: {
          [Op.in]: orders.map((order) => order.id),
        },
      },
      include: [
        {
          model: Product,
          as: "product",
          include: [
            {
              model: Category,
              as: "categories",
              through: { attributes: [] },
            },
          ],
        },
      ],
    }); // Đếm số lượng bán theo danh mục
    const categorySales: { [key: number]: { name: string; count: number } } =
      {};
    orderDetails.forEach((detail) => {
      const detailWithProduct = detail as typeof detail & {
        product?: Product & { categories?: Category[] };
      };
      const product = detailWithProduct.product;
      if (product && product.categories) {
        product.categories.forEach((category) => {
          if (!categorySales[category.id]) {
            categorySales[category.id] = {
              name: category.name,
              count: 0,
            };
          }
          categorySales[category.id].count += detail.quantity;
        });
      }
    }); // Tìm danh mục bán chạy nhất
    let topCategory = "";
    let maxSales = 0;

    Object.values(categorySales).forEach((catSale: any) => {
      if (catSale.count > maxSales) {
        maxSales = catSale.count;
        topCategory = catSale.name;
      }
    }); // Trả về dữ liệu tổng quan
    res.status(200).json({
      totalRevenue,
      totalOrders,
      averageOrderValue,
      totalProducts,
      lowStockProducts,
      topCategory,
    });
    return;
  } catch (error) {
    console.error("Error getting summary report:", error);
    res.status(500).json({ message: "Lỗi khi lấy báo cáo tổng quan" });
    return;
  }
};

/**
 * Lấy dữ liệu doanh thu cho biểu đồ chính
 *
 * Quy trình:
 * 1. Lấy và xử lý tham số khoảng thời gian
 * 2. Lấy dữ liệu đơn hàng và tính toán doanh thu theo ngày
 * 3. Định dạng dữ liệu cho biểu đồ:
 *    - Labels (tên các ngày)
 *    - Dữ liệu doanh thu
 *    - Dữ liệu số đơn hàng
 * 4. Trả về dữ liệu đã định dạng
 *
 * @param req - Request chứa tham số khoảng thời gian
 * @param res - Response trả về dữ liệu biểu đồ
 */
export const getRevenueReport = async (req: Request, res: Response) => {
  try {
    const { dateRange, fromDate, toDate } = req.query;

    // Tính toán khoảng thời gian
    let endDate = new Date();
    let startDate = new Date();
    let groupByFormat: string;
    if (fromDate && toDate && dateRange === "custom") {
      startDate = new Date(fromDate as string);
      endDate = new Date(toDate as string);
      // Mặc định là ngày trong tuần cho khoảng tùy chỉnh, hoặc bạn có thể chọn định dạng khác
      groupByFormat = "%w";
    } else {
      switch (dateRange) {
        case "week":
          startDate.setDate(endDate.getDate() - 7);
          groupByFormat = "%w"; // Day of week
          break;
        case "month":
          startDate.setDate(endDate.getDate() - 30);
          groupByFormat = "%d"; // Day of month
          break;
        case "quarter":
          startDate.setMonth(endDate.getMonth() - 3);
          groupByFormat = "%v"; // Week number
          break;
        case "year":
          startDate.setFullYear(endDate.getFullYear() - 1);
          groupByFormat = "%m"; // Month
          break;
        default:
          startDate.setDate(endDate.getDate() - 7);
          groupByFormat = "%w"; // Day of week
      }
    }

    // Get orders by date
    const orders = await Order.findAll({
      where: {
        createdAt: {
          [Op.between]: [startDate, endDate],
        },
        status: {
          [Op.not]: "cancelled",
        },
      },
      attributes: [
        [
          sequelize.fn(
            "DATE_FORMAT",
            sequelize.col("createdAt"),
            groupByFormat
          ),
          "date",
        ],
        [sequelize.fn("SUM", sequelize.col("total")), "revenue"],
        [sequelize.fn("COUNT", sequelize.col("id")), "orderCount"],
      ],
      group: ["date"],
      order: [[sequelize.literal("date"), "ASC"]],
      raw: true,
    });

    // Format data for chart
    let labels: string[] = [];
    let revenueData: number[] = [];
    let orderCountData: number[] = [];

    if (dateRange === "week" || dateRange === "default") {
      // For week, convert day numbers to day names
      const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
      labels = dayNames;

      // Initialize data arrays with zeros
      revenueData = Array(7).fill(0);
      orderCountData = Array(7).fill(0);

      // Fill in actual data
      orders.forEach((order: any) => {
        const dayIndex = parseInt(order.date);
        revenueData[dayIndex] = parseFloat(order.revenue) / 1000000; // Convert to millions
        orderCountData[dayIndex] = parseInt(order.orderCount);
      });
    } else {
      // For other date ranges, use the actual dates
      orders.forEach((order: any) => {
        labels.push(order.date);
        revenueData.push(parseFloat(order.revenue) / 1000000); // Convert to millions
        orderCountData.push(parseInt(order.orderCount));
      });
    }
    res.status(200).json({
      labels,
      datasets: [
        {
          label: "Doanh thu (triệu VNĐ)",
          data: revenueData,
          backgroundColor: "rgba(60, 141, 188, 0.2)",
          borderColor: "rgba(60, 141, 188, 1)",
          borderWidth: 2,
          tension: 0.3,
          fill: true,
        },
        {
          label: "Đơn hàng",
          data: orderCountData,
          backgroundColor: "rgba(210, 214, 222, 0.2)",
          borderColor: "rgba(210, 214, 222, 1)",
          borderWidth: 2,
          tension: 0.3,
          fill: true,
        },
      ],
    });
    return;
  } catch (error) {
    console.error("Error getting revenue report:", error);
    res.status(500).json({ message: "Error getting revenue report" });
    return;
  }
};

/**
 * Lấy dữ liệu danh mục cho biểu đồ tròn
 *
 * Quy trình:
 * 1. Lấy và xử lý tham số khoảng thời gian
 * 2. Lấy dữ liệu đơn hàng và danh mục sản phẩm
 * 3. Tính toán doanh số theo danh mục
 * 4. Định dạng dữ liệu cho biểu đồ
 * 5. Trả về top 5 danh mục có doanh số cao nhất
 *
 * @param req - Request chứa tham số khoảng thời gian
 * @param res - Response trả về dữ liệu biểu đồ
 */
export const getCategoryReport = async (req: Request, res: Response) => {
  try {
    const { dateRange, fromDate, toDate } = req.query;

    // Calculate date range
    let endDate = new Date();
    let startDate = new Date();

    if (fromDate && toDate && dateRange === "custom") {
      startDate = new Date(fromDate as string);
      endDate = new Date(toDate as string);
    } else {
      switch (dateRange) {
        case "week":
          startDate.setDate(endDate.getDate() - 7);
          break;
        case "month":
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case "quarter":
          startDate.setMonth(endDate.getMonth() - 3);
          break;
        case "year":
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(endDate.getDate() - 7);
      }
    }

    // Get orders in date range
    const orders = await Order.findAll({
      where: {
        createdAt: {
          [Op.between]: [startDate, endDate],
        },
        status: {
          [Op.not]: "cancelled",
        },
      },
      attributes: ["id"],
    });

    // Get order details with product categories
    const orderDetails = await OrderDetail.findAll({
      where: {
        orderId: {
          [Op.in]: orders.map((order) => order.id),
        },
      },
      include: [
        {
          model: Product,
          as: "product",
          include: [
            {
              model: Category,
              as: "categories",
              through: { attributes: [] },
            },
          ],
        },
      ],
    });

    // Calculate sales by category
    const categoryData: { [key: number]: { name: string; revenue: number } } =
      {};

    orderDetails.forEach((detail) => {
      const detailWithProduct = detail as typeof detail & {
        product?: Product & { categories?: Category[] };
      };
      if (detailWithProduct.product && detailWithProduct.product.categories) {
        detailWithProduct.product.categories.forEach((category) => {
          if (!categoryData[category.id]) {
            categoryData[category.id] = {
              name: category.name,
              revenue: 0,
            };
          }

          // Add to revenue (original price * quantity)
          categoryData[category.id].revenue +=
            detail.originalPrice * detail.quantity;
        });
      }
    });

    // Format data for chart
    const labels: string[] = [];
    interface CategoryChartData {
      name: string;
      revenue: number;
    }
    const data: number[] = [];
    const backgroundColors = [
      "#f56954",
      "#00a65a",
      "#f39c12",
      "#00c0ef",
      "#3c8dbc",
      "#d2d6de",
      "#6C757D",
      "#28a745",
      "#dc3545",
      "#ffc107",
    ];

    // Sort categories by revenue
    const sortedCategories = Object.values(categoryData)
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 5); // Get top 5 categories

    sortedCategories.forEach((category: any, index) => {
      labels.push(category.name);
      data.push(category.revenue / 1000000); // Convert to millions
    });
    res.status(200).json({
      labels,
      datasets: [
        {
          label: "Doanh số theo danh mục (triệu VNĐ)",
          data,
          backgroundColor: backgroundColors.slice(0, data.length),
          borderWidth: 1,
        },
      ],
    });
    return;
  } catch (error) {
    console.error("Error getting category report:", error);
    res.status(500).json({ message: "Error getting category report" });
    return;
  }
};

// Define ProductReport type for top products report

type ProductReport = {
  id: number;
  sku: string;
  name: string;
  category: string;
  subCategory: string[];
  sales: number;
  revenue: number;
  stock: number;
  suitabilities: string[];
};

/**
 * Lấy báo cáo top sản phẩm bán chạy
 *
 * Quy trình:
 * 1. Lấy và xác thực tham số khoảng thời gian
 * 2. Lấy dữ liệu bán hàng theo sản phẩm
 * 3. Lấy thông tin chi tiết của các sản phẩm
 * 4. Tính toán và kết hợp dữ liệu
 * 5. Sắp xếp và lấy top 5 sản phẩm theo doanh thu
 * 6. Trả về kết quả với thông tin đầy đủ của sản phẩm
 *
 * @param req - Request chứa tham số khoảng thời gian
 * @param res - Response trả về danh sách top sản phẩm
 */
export const getTopProductsReport = async (req: Request, res: Response) => {
  try {
    const { dateRange, fromDate, toDate } = req.query;

    // Kiểm tra đầu vào
    if (dateRange === "custom" && (!fromDate || !toDate)) {
      res.status(400).json({
        message:
          "Vui lòng cung cấp fromDate và toDate cho khoảng thời gian tùy chỉnh",
      });
      return;
    }

    // Calculate date range
    let endDate = new Date();
    let startDate = new Date();

    if (dateRange === "custom" && fromDate && toDate) {
      startDate = new Date(fromDate as string);
      endDate = new Date(toDate as string);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        res.status(400).json({ message: "Định dạng ngày không hợp lệ" });
        return;
      }
      if (startDate > endDate) {
        res.status(400).json({ message: "fromDate phải trước toDate" });
        return;
      }
    } else {
      switch (dateRange) {
        case "week":
          startDate.setDate(endDate.getDate() - 7);
          break;
        case "month":
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case "quarter":
          startDate.setMonth(endDate.getMonth() - 3);
          break;
        case "year":
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(endDate.getDate() - 7);
      }
    }

    // Bước 1: Lấy dữ liệu tổng hợp bán hàng theo sản phẩm
    const productSales = (await OrderDetail.findAll({
      where: {
        orderId: {
          [Op.in]: sequelize.literal(`(
    SELECT id FROM orders 
    WHERE createdAt BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}'
    AND status != 'cancelled'
  )`),
        },
      },
      attributes: [
        "productId",
        [sequelize.fn("SUM", sequelize.col("quantity")), "totalQuantity"],
        [
          sequelize.fn("SUM", sequelize.literal("discountPrice * quantity")),
          "totalRevenue",
        ],
      ],
      group: ["productId"],
      raw: true,
    })) as unknown as ProductSaleResult[];

    // Bước 2: Lấy thông tin chi tiết sản phẩm riêng biệt
    const productIds = productSales.map((item: any) => item.productId);

    const products = await Product.findAll({
      where: {
        id: { [Op.in]: productIds },
      },
      attributes: ["id", "name", "sku"],
      include: [
        {
          model: Category,
          as: "categories",
          attributes: ["id", "name"],
          through: { attributes: [] },
        },
        {
          model: ProductDetail,
          as: "details",
          attributes: ["id"],
          include: [
            {
              model: ProductInventory,
              as: "inventories",
              attributes: ["stock"],
            },
          ],
        },
        {
          model: Suitability,
          as: "suitabilities",
          attributes: ["id", "name"],
          through: { attributes: [] },
        },
      ],
    });

    // Bước 3: Xử lý dữ liệu báo cáo - kết hợp dữ liệu
    const productData = productIds
      .map((productId: number) => {
        const salesInfo = productSales.find(
          (item: any) => item.productId === productId
        );
        const product = products.find((p) => p.id === productId);

        if (!product || !salesInfo) {
          return null;
        }

        // Lấy danh mục chính
        const mainCategory =
          product.categories && product.categories.length > 0
            ? product.categories[0].name
            : "Không xác định";

        // lấy danh mục con nếu có
        const subCategories =
          product.categories && product.categories.length > 1
            ? product.categories.slice(1).map((cat: any) => cat.name)
            : [];

        // Tính tổng stock
        let stock = 0;
        if (product.details && Array.isArray(product.details)) {
          product.details.forEach((prodDetail: any) => {
            if (
              prodDetail?.inventories &&
              Array.isArray(prodDetail.inventories)
            ) {
              prodDetail.inventories.forEach((inv: any) => {
                stock += inv?.stock || 0;
              });
            }
          });
        }

        // Lấy suitabilities
        const suitabilities =
          product.suitabilities && product.suitabilities.length > 0
            ? product.suitabilities
                .map((s: any) => s?.name || "")
                .filter(Boolean)
            : [];

        return {
          id: productId,
          sku: product.sku || `SP${productId.toString().padStart(3, "0")}`,
          name: product.name || "Không xác định",
          category: mainCategory,
          subCategory: subCategories,
          sales: parseInt(salesInfo.totalQuantity) || 0,
          revenue: parseFloat(salesInfo.totalRevenue) || 0,
          stock,
          suitabilities,
        };
      })
      .filter((item): item is ProductReport => item !== null);

    // Sort and get top products
    const topProducts = productData
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Log để debug
    console.log("Top products:", JSON.stringify(topProducts, null, 2));

    res.status(200).json({
      products: topProducts,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Error getting top products report:", {
      message: error.message,
      stack: error.stack,
      query: req.query,
    });
    res.status(500).json({
      message: "Lỗi khi lấy báo cáo top sản phẩm",
      error: error.message || "Unknown error",
    });
  }
};

/**
 * Lấy danh sách sản phẩm có tồn kho thấp
 *
 * Quy trình:
 * 1. Lấy và xác thực ngưỡng tồn kho từ query params
 * 2. Truy vấn các sản phẩm có tồn kho thấp hơn ngưỡng
 * 3. Nhóm dữ liệu theo sản phẩm và tính toán các chỉ số
 * 4. Sắp xếp theo mức tồn kho tăng dần
 * 5. Trả về danh sách sản phẩm đã xử lý
 *
 * @param req - Request chứa ngưỡng tồn kho
 * @param res - Response trả về danh sách sản phẩm tồn kho thấp
 */
export const getLowStockProducts = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Kiểm tra và lấy threshold từ query
    const threshold = parseInt(req.query.threshold as string) || 10;
    if (threshold < 0) {
      res.status(400).json({ message: "Threshold phải là số không âm" });
      return;
    }

    // Truy vấn ProductInventory có stock <= threshold
    const inventories = await ProductInventory.findAll({
      where: {
        stock: {
          [Op.lte]: threshold,
        },
      },
      include: [
        {
          model: ProductDetail,
          as: "productDetail",
          attributes: ["id", "color"],
          include: [
            {
              model: Product,
              as: "product",
              attributes: ["id", "name", "sku"],
              include: [
                {
                  model: Category,
                  as: "categories",
                  attributes: ["id", "name"],
                  through: { attributes: [] },
                },
              ],
            },
          ],
        },
      ],
      order: [["stock", "ASC"]], // Sắp xếp theo stock tăng dần
    });

    // Nhóm inventories theo productId
    const productMap: { [key: number]: LowStockProduct } = {};

    inventories.forEach((inv: any) => {
      const detail = inv.productDetail;
      const product = detail?.product;
      if (!product || !detail) return;

      const productId = product.id;
      if (!productMap[productId]) {
        const mainCategory =
          product.categories && product.categories.length > 0
            ? product.categories[0].name
            : "Không xác định";

        productMap[productId] = {
          id: productId,
          sku: product.sku || `SP${productId.toString().padStart(3, "0")}`,
          name: product.name || "Không xác định",
          category: mainCategory,
          stock: inv.stock, // Sẽ cập nhật nếu tìm thấy stock thấp hơn
          threshold,
          variants: [],
          totalVariants: 0,
        };
      }

      // Cập nhật stock thấp nhất
      if (inv.stock < productMap[productId].stock) {
        productMap[productId].stock = inv.stock;
      }

      // Thêm biến thể
      productMap[productId].variants.push({
        detailId: detail.id,
        size: inv.size || "N/A",
        color: detail.color || "N/A",
        stock: inv.stock,
        needsRestock: inv.stock <= Math.min(5, threshold / 2),
      });
    });

    // Chuyển productMap thành mảng và tính totalVariants
    const lowStockProducts: LowStockProduct[] = Object.values(productMap).map(
      (product) => ({
        ...product,
        totalVariants: product.variants.length,
      })
    );

    // Sắp xếp theo stock (thấp nhất trước)
    lowStockProducts.sort((a, b) => a.stock - b.stock);

    // Log để debug
    console.log(
      "Low stock products:",
      JSON.stringify(lowStockProducts, null, 2)
    );

    res.status(200).json(lowStockProducts);
    return;
  } catch (error: any) {
    console.error("Error getting low stock products:", {
      message: error.message,
      stack: error.stack,
      query: req.query,
    });
    res.status(500).json({
      message: "Lỗi khi lấy danh sách sản phẩm tồn kho thấp",
      error: error.message || "Unknown error",
    });
    return;
  }
};

/**
 * Lấy dữ liệu hiệu suất sản phẩm cho biểu đồ đường
 *
 * Quy trình:
 * 1. Lấy và xử lý tham số khoảng thời gian
 * 2. Lấy dữ liệu đơn hàng trong khoảng thời gian
 * 3. Lấy chi tiết đơn hàng và tính toán doanh số theo sản phẩm
 * 4. Lấy và định dạng top 3 sản phẩm có doanh số cao nhất
 * 5. Tạo dữ liệu biểu đồ theo từng ngày
 * 6. Trả về kết quả với datasets cho mỗi sản phẩm
 *
 * @param req - Request chứa tham số khoảng thời gian
 * @param res - Response trả về dữ liệu biểu đồ hiệu suất
 */
export const getProductPerformance = async (req: Request, res: Response) => {
  try {
    const { dateRange, fromDate, toDate } = req.query;
    // Calculate date range
    let endDate = new Date();
    let startDate = new Date();
    let groupByFormat: string;
    if (fromDate && toDate && dateRange === "custom") {
      startDate = new Date(fromDate as string);
      endDate = new Date(toDate as string);
    } else {
      switch (dateRange) {
        case "week":
          startDate.setDate(endDate.getDate() - 7);
          groupByFormat = "%w"; // Day of week
          break;
        case "month":
          startDate.setDate(endDate.getDate() - 30);
          groupByFormat = "%d"; // Day of month
          break;
        case "quarter":
          startDate.setMonth(endDate.getMonth() - 3);
          groupByFormat = "%v"; // Week number
          break;
        case "year":
          startDate.setFullYear(endDate.getFullYear() - 1);
          groupByFormat = "%m"; // Month
          break;
        default:
          startDate.setDate(endDate.getDate() - 7);
          groupByFormat = "%w"; // Day of week
      }
    }
    // Get orders in date range
    const orders = await Order.findAll({
      where: {
        createdAt: {
          [Op.between]: [startDate, endDate],
        },
        status: {
          [Op.not]: "cancelled",
        },
      },
      attributes: ["id", "createdAt"],
    });
    // Get top 3 products by sales
    const orderDetails = await OrderDetail.findAll({
      where: {
        orderId: {
          [Op.in]: orders.map((order) => order.id),
        },
      },
      include: [
        {
          model: Product,
          as: "product",
        },
        {
          model: Order,
          as: "order",
          attributes: ["createdAt"],
        },
      ],
    });
    // Calculate sales by product
    const productSales: {
      [productId: number]: {
        id: number;
        name: string;
        totalSales: number;
        salesByDay: { [key: string]: number };
      };
    } = {};
    orderDetails.forEach((detail) => {
      const detailWithProduct = detail as typeof detail & {
        product?: Product;
        order?: Order;
      };
      if (detailWithProduct.product) {
        if (!productSales[detailWithProduct.productId]) {
          productSales[detailWithProduct.productId] = {
            id: detailWithProduct.productId,
            name: detailWithProduct.product.name,
            totalSales: 0,
            salesByDay: {},
          };
        }
        productSales[detailWithProduct.productId].totalSales +=
          detailWithProduct.quantity;
        // Group by day
        const orderDate = new Date((detailWithProduct.order as any)?.createdAt);
        const dayKey =
          dateRange === "week" || dateRange === "default"
            ? orderDate.getDay().toString() // 0-6 for Sun-Sat
            : orderDate.toISOString().split("T")[0]; // YYYY-MM-DD
        if (!productSales[detailWithProduct.productId].salesByDay[dayKey]) {
          productSales[detailWithProduct.productId].salesByDay[dayKey] = 0;
        }
        productSales[detailWithProduct.productId].salesByDay[dayKey] +=
          detailWithProduct.quantity;
      }
    });
    // Sort products by total sales and get top 3
    const topProducts = Object.values(productSales)
      .sort((a: any, b: any) => b.totalSales - a.totalSales)
      .slice(0, 3);
    // Format data for chart
    let labels: string[] = [];
    if (dateRange === "week" || dateRange === "default") {
      labels = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    } else {
      const allDates = new Set();
      topProducts.forEach((product: any) => {
        Object.keys(product.salesByDay).forEach((date) => allDates.add(date));
      });
      labels = Array.from(allDates).sort() as string[];
    }
    // Generate datasets
    const datasets = topProducts.map((product: any, index) => {
      const colors = [
        { border: "#f56954", background: "rgba(245, 105, 84, 0.2)" },
        { border: "#00a65a", background: "rgba(0, 166, 90, 0.2)" },
        { border: "#f39c12", background: "rgba(243, 156, 18, 0.2)" },
      ];
      const data = labels.map((label) => {
        return product.salesByDay[label] || 0;
      });
      return {
        label: product.name,
        data,
        borderColor: colors[index].border,
        backgroundColor: colors[index].background,
        tension: 0.3,
        fill: true,
      };
    });
    res.status(200).json({
      labels,
      datasets,
    });
    return;
  } catch (error) {
    console.error("Error getting product performance data:", error);
    res.status(500).json({ message: "Error getting product performance data" });
  }
  return;
};

/**
 * Lấy dữ liệu hiệu suất danh mục
 *
 * Quy trình:
 * 1. Lấy và xử lý tham số khoảng thời gian
 * 2. Tính toán khoảng thời gian so sánh
 * 3. Lấy dữ liệu đơn hàng cho cả hai khoảng thời gian
 * 4. Tính toán chỉ số hiệu suất cho từng danh mục:
 *    - Doanh số
 *    - Số lượng bán
 *    - Tỷ lệ tăng trưởng
 * 5. Sắp xếp và trả về kết quả theo doanh số
 *
 * @param req - Request chứa tham số khoảng thời gian
 * @param res - Response trả về dữ liệu hiệu suất danh mục
 */

export const getCategoryPerformance = async (req: Request, res: Response) => {
  try {
    const { dateRange, fromDate, toDate } = req.query;
    // Calculate date range
    let endDate = new Date();
    let startDate = new Date();
    let previousStartDate = new Date();
    let previousEndDate = new Date();
    if (fromDate && toDate && dateRange === "custom") {
      startDate = new Date(fromDate as string);
      endDate = new Date(toDate as string);
      const daysDiff =
        (endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24);
      previousEndDate = new Date(startDate);
      previousEndDate.setDate(previousEndDate.getDate() - 1);
      previousStartDate = new Date(previousEndDate);
      previousStartDate.setDate(previousStartDate.getDate() - daysDiff);
    } else {
      switch (dateRange) {
        case "week":
          startDate.setDate(endDate.getDate() - 7);
          previousEndDate = new Date(startDate);
          previousEndDate.setDate(previousEndDate.getDate() - 1);
          previousStartDate = new Date(previousEndDate);
          previousStartDate.setDate(previousStartDate.getDate() - 7);
          break;
        case "month":
          startDate.setMonth(endDate.getMonth() - 1);
          previousEndDate = new Date(startDate);
          previousEndDate.setDate(previousEndDate.getDate() - 1);
          previousStartDate = new Date(previousEndDate);
          previousStartDate.setMonth(previousStartDate.getMonth() - 1);
          break;
        case "quarter":
          startDate.setMonth(endDate.getMonth() - 3);
          previousEndDate = new Date(startDate);
          previousEndDate.setDate(previousEndDate.getDate() - 1);
          previousStartDate = new Date(previousEndDate);
          previousStartDate.setMonth(previousStartDate.getMonth() - 3);
          break;
        case "year":
          startDate.setFullYear(endDate.getFullYear() - 1);
          previousEndDate = new Date(startDate);
          previousEndDate.setDate(previousEndDate.getDate() - 1);
          previousStartDate = new Date(previousEndDate);
          previousStartDate.setFullYear(previousStartDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(endDate.getDate() - 7);
          previousEndDate = new Date(startDate);
          previousEndDate.setDate(previousEndDate.getDate() - 1);
          previousStartDate = new Date(previousEndDate);
          previousStartDate.setDate(previousStartDate.getDate() - 7);
      }
    }
    // Get current period orders
    const currentOrders = await Order.findAll({
      where: {
        createdAt: {
          [Op.between]: [startDate, endDate],
        },
        status: {
          [Op.not]: "cancelled",
        },
      },
      attributes: ["id"],
    });
    // Get previous period orders
    const previousOrders = await Order.findAll({
      where: {
        createdAt: {
          [Op.between]: [previousStartDate, previousEndDate],
        },
        status: {
          [Op.not]: "cancelled",
        },
      },
      attributes: ["id"],
    });
    // Get current order details with product categories
    const currentOrderDetails = await OrderDetail.findAll({
      where: {
        orderId: {
          [Op.in]: currentOrders.map((order) => order.id),
        },
      },
      include: [
        {
          model: Product,
          as: "product",
          include: [
            {
              model: Category,
              as: "categories",
              through: { attributes: [] },
            },
          ],
        },
      ],
    });
    // Get previous order details with product categories
    const previousOrderDetails = await OrderDetail.findAll({
      where: {
        orderId: {
          [Op.in]: previousOrders.map((order) => order.id),
        },
      },
      include: [
        {
          model: Product,
          as: "product",
          include: [
            {
              model: Category,
              as: "categories",
              through: { attributes: [] },
            },
          ],
        },
      ],
    });
    // Calculate current period category stats
    const currentCategoryStats: {
      [key: number]: {
        id: number;
        name: string;
        sales: number;
        revenue: number;
        products: Set<number>;
      };
    } = {};
    currentOrderDetails.forEach((detail) => {
      const detailWithProduct = detail as typeof detail & { product?: Product };
      if (detailWithProduct.product && detailWithProduct.product.categories) {
        detailWithProduct.product.categories.forEach((category) => {
          if (!currentCategoryStats[category.id]) {
            currentCategoryStats[category.id] = {
              id: category.id,
              name: category.name,
              sales: 0,
              revenue: 0,
              products: new Set(),
            };
          }
          currentCategoryStats[category.id].sales += detail.quantity;
          currentCategoryStats[category.id].revenue +=
            Number(detail.originalPrice) * Number(detail.quantity);
          currentCategoryStats[category.id].products.add(detail.productId);
        });
      }
    });
    // Calculate previous period category stats
    const previousCategoryStats: {
      [key: number]: {
        id: number;
        name: string;
        sales: number;
        revenue: number;
      };
    } = {};
    previousOrderDetails.forEach((detail) => {
      const detailWithProduct = detail as typeof detail & { product?: Product };
      if (detailWithProduct.product && detailWithProduct.product.categories) {
        detailWithProduct.product.categories.forEach((category) => {
          if (!previousCategoryStats[category.id]) {
            previousCategoryStats[category.id] = {
              id: category.id,
              name: category.name,
              sales: 0,
              revenue: 0,
            };
          }
          previousCategoryStats[category.id].sales += detail.quantity;
          previousCategoryStats[category.id].revenue +=
            Number(detail.originalPrice) * Number(detail.quantity);
        });
      }
    });
    // Calculate growth and format data
    const categoryPerformance = Object.values(currentCategoryStats).map(
      (category: any) => {
        let growth = 0;
        if (previousCategoryStats[category.id]) {
          const previousRevenue = previousCategoryStats[category.id].revenue;
          growth =
            previousRevenue === 0
              ? 100
              : Math.round(
                  ((category.revenue - previousRevenue) / previousRevenue) * 100
                );
        } else {
          growth = 100;
        }
        return {
          id: category.id,
          name: category.name,
          sales: category.sales,
          revenue: category.revenue,
          products: category.products.size,
          growth: growth,
        };
      }
    );
    res
      .status(200)
      .json(categoryPerformance.sort((a, b) => b.revenue - a.revenue));
    return;
  } catch (error) {
    console.error("Error getting category performance data:", error);
    res
      .status(500)
      .json({ message: "Error getting category performance data" });
  }
  return;
};

interface DateRangeQuery {
  dateRange?: string;
  timeRange?: string;
  fromDate?: string;
  toDate?: string;
}

/**
 * Lấy dữ liệu phân tích đơn hàng
 *
 * Quy trình:
 * 1. Lấy và xử lý tham số khoảng thời gian
 * 2. Tính toán khoảng thời gian hiện tại và khoảng thời gian so sánh
 * 3. Lấy dữ liệu đơn hàng cho cả hai khoảng thời gian
 * 4. Tính toán các chỉ số:
 *    - Tổng số đơn hàng
 *    - Tỷ lệ hoàn thành
 *    - Giá trị đơn hàng trung bình
 *    - Phân bố trạng thái đơn hàng
 *    - Phân bố phương thức thanh toán
 * 5. Tính toán tỷ lệ tăng trưởng so với kỳ trước
 * 6. Trả về kết quả phân tích chi tiết
 *
 * @param req - Request chứa tham số khoảng thời gian (dateRange/timeRange)
 * @param res - Response trả về dữ liệu phân tích đơn hàng
 */
export const getOrderAnalysis = async (req: Request, res: Response) => {
  try {
    const timeRange = req.query.dateRange || req.query.timeRange || "week";
    console.log("Khoảng thời gian:", timeRange);

    // Tính toán khoảng thời gian
    const endDate = new Date();
    let startDate = new Date();
    let previousEndDate = new Date();
    let previousStartDate = new Date();

    switch (timeRange) {
      case "week":
        startDate.setDate(endDate.getDate() - 6);
        // Previous period
        previousEndDate = new Date(startDate);
        previousEndDate.setDate(previousEndDate.getDate() - 1);
        previousStartDate = new Date(previousEndDate);
        previousStartDate.setDate(previousStartDate.getDate() - 6);
        break;
      case "month":
        startDate.setDate(endDate.getDate() - 29);
        // Previous period
        previousEndDate = new Date(startDate);
        previousEndDate.setDate(previousEndDate.getDate() - 1);
        previousStartDate = new Date(previousEndDate);
        previousStartDate.setDate(previousStartDate.getDate() - 29);
        break;
      case "quarter":
        startDate.setMonth(endDate.getMonth() - 2);
        startDate.setDate(1);
        // Previous period
        previousEndDate = new Date(startDate);
        previousEndDate.setDate(previousEndDate.getDate() - 1);
        previousStartDate = new Date(previousEndDate);
        previousStartDate.setMonth(previousStartDate.getMonth() - 2);
        previousStartDate.setDate(1);
        break;
      case "year":
        startDate.setFullYear(endDate.getFullYear() - 1);
        startDate.setDate(endDate.getDate() + 1);
        // Previous period
        previousEndDate = new Date(startDate);
        previousEndDate.setDate(previousEndDate.getDate() - 1);
        previousStartDate = new Date(previousEndDate);
        previousStartDate.setFullYear(previousStartDate.getFullYear() - 1);
        previousStartDate.setDate(previousStartDate.getDate() + 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 6);
        // Previous period
        previousEndDate = new Date(startDate);
        previousEndDate.setDate(previousEndDate.getDate() - 1);
        previousStartDate = new Date(previousEndDate);
        previousStartDate.setDate(previousStartDate.getDate() - 6);
    }

    // Lấy đơn hàng kỳ hiện tại
    const currentOrders = await Order.findAll({
      where: {
        createdAt: {
          [Op.between]: [startDate, endDate],
        },
      },
      include: [
        {
          model: PaymentMethod,
          as: "paymentMethod",
        },
      ],
    });

    // Lấy đơn hàng kỳ trước
    const previousOrders = await Order.findAll({
      where: {
        createdAt: {
          [Op.between]: [previousStartDate, previousEndDate],
        },
      },
    });

    // Định dạng nhãn ngày tháng cho response
    interface FormatDate {
      (date: Date): string;
    }

    const formatDate: FormatDate = (date: Date): string => {
      return `${date.getDate().toString().padStart(2, "0")}/${(
        date.getMonth() + 1
      )
        .toString()
        .padStart(2, "0")}/${date.getFullYear()}`;
    };

    const dateLabels = {
      current: `${
        timeRange === "week"
          ? "7 ngày"
          : timeRange === "month"
          ? "30 ngày"
          : timeRange === "quarter"
          ? "3 tháng"
          : "12 tháng"
      } gần nhất (${formatDate(startDate)} - ${formatDate(endDate)})`,
      previous: `kỳ trước (${formatDate(previousStartDate)} - ${formatDate(
        previousEndDate
      )})`,
    };

    // Tính toán thống kê kỳ hiện tại
    const currentStats = {
      totalOrders: currentOrders.length,
      completedOrders: currentOrders.filter(
        (order) => order.status === "delivered"
      ).length,
      totalValue: currentOrders.reduce((sum, order) => sum + order.total, 0),
      statuses: {
        pending: 0,
        processing: 0,
        shipping: 0,
        delivered: 0,
        cancelled: 0,
      },
      paymentMethods: {} as {
        [key: string]: { count: number; percentage: number };
      },
    };

    // Tính tỷ lệ hoàn thành
    const completionRate =
      currentStats.totalOrders > 0
        ? (currentStats.completedOrders / currentStats.totalOrders) * 100
        : 0;

    // Tính giá trị đơn hàng trung bình
    const avgOrderValue =
      currentStats.totalOrders > 0
        ? currentStats.totalValue / currentStats.totalOrders
        : 0;

    // Đếm đơn hàng theo trạng thái và phương thức thanh toán
    currentOrders.forEach((order) => {
      // Đếm theo trạng thái
      currentStats.statuses[
        order.status as keyof typeof currentStats.statuses
      ] =
        (currentStats.statuses[
          order.status as keyof typeof currentStats.statuses
        ] || 0) + 1;

      // Đếm theo phương thức thanh toán
      const paymentMethod =
        (order as any).paymentMethod && (order as any).paymentMethod.name
          ? (order as any).paymentMethod.name
          : "Unknown";
      if (!currentStats.paymentMethods[paymentMethod]) {
        currentStats.paymentMethods[paymentMethod] = {
          count: 0,
          percentage: 0,
        };
      }
      currentStats.paymentMethods[paymentMethod].count += 1;
    });

    // Tính phần trăm cho phương thức thanh toán
    Object.values(currentStats.paymentMethods).forEach((method: any) => {
      method.percentage =
        currentStats.totalOrders > 0
          ? (method.count / currentStats.totalOrders) * 100
          : 0;
    });

    // Tính toán thống kê kỳ trước
    const previousStats = {
      totalOrders: previousOrders.length,
      completedOrders: previousOrders.filter(
        (order) => order.status === "delivered"
      ).length,
      totalValue: previousOrders.reduce((sum, order) => sum + order.total, 0),
    };

    // Tính tỷ lệ hoàn thành kỳ trước
    const previousCompletionRate =
      previousStats.totalOrders > 0
        ? (previousStats.completedOrders / previousStats.totalOrders) * 100
        : 0;

    // Tính giá trị đơn hàng trung bình kỳ trước
    const previousAvgOrderValue =
      previousStats.totalOrders > 0
        ? previousStats.totalValue / previousStats.totalOrders
        : 0;

    // Tính tỷ lệ tăng trưởng
    const orderGrowth =
      previousStats.totalOrders > 0
        ? ((currentStats.totalOrders - previousStats.totalOrders) /
            previousStats.totalOrders) *
          100
        : 100;

    const completionRateGrowth =
      previousCompletionRate > 0
        ? ((completionRate - previousCompletionRate) / previousCompletionRate) *
          100
        : 100;

    const avgValueGrowth =
      previousAvgOrderValue > 0
        ? ((avgOrderValue - previousAvgOrderValue) / previousAvgOrderValue) *
          100
        : 100;

    // Trả về dữ liệu đã định dạng
    res.status(200).json({
      dateLabels,
      current: {
        totalOrders: currentStats.totalOrders,
        completionRate: completionRate.toFixed(1),
        avgOrderValue: avgOrderValue,
        statuses: currentStats.statuses,
        paymentMethods: currentStats.paymentMethods,
      },
      growth: {
        orders: orderGrowth.toFixed(1),
        completionRate: completionRateGrowth.toFixed(1),
        avgValue: avgValueGrowth.toFixed(1),
        totalOrders: previousStats.totalOrders,
        completedOrders: previousStats.completedOrders,
        avgOrderValue: previousAvgOrderValue,
      },
    });
    return;
  } catch (error) {
    console.error("Lỗi khi lấy phân tích đơn hàng:", error);
    res.status(500).json({ message: "Lỗi khi lấy phân tích đơn hàng" });
    return;
  }
};
