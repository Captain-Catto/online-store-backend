import { Request, Response } from "express";
import { Op } from "sequelize";
import Category from "../models/Category";
import Product from "../models/Product";
import ProductDetail from "../models/ProductDetail";
import ProductInventory from "../models/ProductInventory";
import ProductImage from "../models/ProductImage";
import Suitability from "../models/Suitability";
import { upload, deleteFile } from "../services/categoryImageUpload";

// Tạo mới một category với upload ảnh lên S3
/**
 * Tạo mới một danh mục với hình ảnh được upload lên Amazon S3
 * Flow:
 * Step 1: Upload ảnh lên S3 sử dụng middleware multer-s3
 * Step 2: Validate thông tin danh mục
 * Step 3: Kiểm tra xem slug đã tồn tại chưa
 * Step 4: Lấy URL hình ảnh từ S3 (nếu có)
 * Step 5: Tạo danh mục mới trong database
 * Step 6: Trả về thông tin danh mục đã tạo
 */
export const createCategory = async (
  req: Request,
  res: Response
): Promise<void> => {
  // Step 1: Upload ảnh lên S3 sử dụng middleware multer-s3
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: `Lỗi upload: ${err.message}` });
    }

    try {
      // Step 2: Validate thông tin danh mục
      const { name, slug, description, parentId, isActive } = req.body;

      // Step 3: Kiểm tra xem slug đã tồn tại chưa
      const existingCategory = await Category.findOne({ where: { slug } });
      if (existingCategory) {
        return res.status(400).json({ message: "Slug danh mục đã tồn tại" });
      }

      // Step 4: Lấy URL hình ảnh từ S3 nếu có upload
      const file = req.file as Express.MulterS3.File;
      const imageUrl = file ? file.location : null; // multer-s3 tự động cung cấp location là URL của file

      // Step 5: Tạo danh mục mới trong database
      const newCategory = await Category.create({
        name,
        slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
        description,
        parentId: parentId || null,
        image: imageUrl, // Lưu toàn bộ S3 URL vào database
        isActive: isActive === "true" || isActive === true,
      });

      // Step 6: Trả về thông tin danh mục đã tạo
      res.status(201).json(newCategory);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
};

// Cập nhật function updateCategory để sử dụng S3
/**
 * Cập nhật thông tin danh mục bao gồm cả hình ảnh (sử dụng Amazon S3)
 * Flow:
 * Step 1: Upload ảnh mới lên S3 (nếu có) sử dụng middleware multer-s3
 * Step 2: Tìm kiếm danh mục cần cập nhật theo ID
 * Step 3: Kiểm tra slug mới có bị trùng với danh mục khác không
 * Step 4: Chuẩn bị dữ liệu cập nhật
 * Step 5: Xử lý trường hợp upload hình ảnh mới (xóa ảnh cũ, cập nhật URL mới)
 * Step 6: Cập nhật thông tin danh mục vào database
 * Step 7: Trả về kết quả cập nhật
 */
export const updateCategory = async (
  req: Request,
  res: Response
): Promise<void> => {
  // Step 1: Upload ảnh mới lên S3 (nếu có) sử dụng middleware multer-s3
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: `Lỗi upload: ${err.message}` });
    }

    try {
      const { id } = req.params;
      const { name, slug, description, parentId, isActive } = req.body;

      // Step 2: Tìm kiếm danh mục cần cập nhật theo ID
      const category = await Category.findByPk(id);
      if (!category) {
        return res.status(404).json({ message: "Danh mục không tồn tại" });
      }

      // Step 3: Kiểm tra slug mới có bị trùng với danh mục khác không
      if (slug && slug !== category.slug) {
        const existingCategory = await Category.findOne({
          where: {
            slug,
            id: { [Op.ne]: id },
          },
        });
        if (existingCategory) {
          return res.status(400).json({ message: "Slug danh mục đã tồn tại" });
        }
      }

      // Step 4: Chuẩn bị dữ liệu cập nhật
      const updateData: any = {
        name: name || category.name,
        slug: slug || category.slug,
        description,
        parentId: parentId !== undefined ? parentId || null : category.parentId,
        isActive:
          isActive !== undefined ? isActive === "true" : category.isActive,
      };

      // Step 5: Xử lý trường hợp upload hình ảnh mới
      const file = req.file as Express.MulterS3.File;
      if (file) {
        // Xóa ảnh cũ trên S3 nếu có
        if (
          category.image &&
          category.image.includes(process.env.S3_BUCKET || "")
        ) {
          await deleteFile(category.image);
        }

        // Cập nhật URL mới
        updateData.image = file.location;
      }

      // Step 6: Cập nhật thông tin danh mục vào database
      await category.update(updateData);

      // Step 7: Trả về kết quả cập nhật
      res.status(200).json({ message: "Cập nhật thành công", category });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });
};

// lấy chi tiết một category theo ID
/**
 * Lấy thông tin chi tiết của một danh mục theo ID
 * Flow:
 * Step 1: Lấy ID danh mục từ params request
 * Step 2: Truy vấn database để tìm danh mục theo ID và lấy thông tin chi tiết
 * Step 3: Kèm theo các danh mục con (nếu có)
 * Step 4: Kiểm tra nếu không tìm thấy danh mục
 * Step 5: Trả về thông tin danh mục nếu tìm thấy
 */
export const getCategoryById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Step 1: Lấy ID danh mục từ params request
    const { id } = req.params;

    // Step 2: Truy vấn database để tìm danh mục theo ID
    // Step 3: Kèm theo các danh mục con (nếu có)
    const category = await Category.findByPk(id, {
      attributes: [
        "id",
        "name",
        "slug",
        "description",
        "image",
        "parentId",
        "isActive",
      ],
      include: [
        {
          model: Category,
          as: "children",
          attributes: ["id", "name", "slug", "isActive"],
          where: { isActive: true },
          required: false, // LEFT JOIN
        },
      ],
    });

    // Step 4: Kiểm tra nếu không tìm thấy danh mục
    if (!category) {
      res.status(404).json({ message: "Danh mục không tồn tại" });
      return;
    }

    // Step 5: Trả về thông tin danh mục nếu tìm thấy
    res.status(200).json(category);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Xóa category và hình ảnh S3 kèm theo
/**
 * Xóa danh mục và hình ảnh kèm theo trên Amazon S3
 * Flow:
 * Step 1: Lấy ID danh mục cần xóa từ params request
 * Step 2: Tìm danh mục theo ID
 * Step 3: Kiểm tra nếu không tìm thấy danh mục
 * Step 4: Xóa hình ảnh trên S3 nếu có
 * Step 5: Xóa danh mục khỏi database
 * Step 6: Trả về thông báo xóa thành công
 */
export const deleteCategory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Step 1: Lấy ID danh mục cần xóa từ params request
    const { id } = req.params;

    // Step 2: Tìm danh mục theo ID
    const category = await Category.findByPk(id);

    // Step 3: Kiểm tra nếu không tìm thấy danh mục
    if (!category) {
      res.status(404).json({ message: "Category không tồn tại" });
      return;
    }

    // Step 4: Xóa hình ảnh trên S3 nếu có
    if (
      category.image &&
      category.image.includes(process.env.S3_BUCKET || "")
    ) {
      await deleteFile(category.image);
    }

    // Step 5: Xóa danh mục khỏi database
    await category.destroy();

    // Step 6: Trả về thông báo xóa thành công
    res.status(200).json({ message: "Xóa Category thành công" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// lấy tất cả categories và subtypes kể cả không active
/**
 * Lấy tất cả danh mục bao gồm cả danh mục con, không phân biệt trạng thái active
 * Flow:
 * Step 1: Truy vấn database lấy tất cả danh mục
 * Step 2: Sắp xếp các danh mục theo tên (A-Z)
 * Step 3: Tổ chức lại dữ liệu thành cấu trúc cha-con
 * Step 4: Trả về danh sách danh mục đã được tổ chức
 */
export const getAllCategories = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Step 1: Truy vấn database lấy tất cả danh mục
    // Step 2: Sắp xếp các danh mục theo tên (A-Z)
    const categories = await Category.findAll({
      attributes: [
        "id",
        "name",
        "slug",
        "description",
        "image",
        "parentId",
        "isActive",
      ],
      order: [["name", "ASC"]],
    });

    // Step 3: Tổ chức lại dữ liệu thành cấu trúc cha-con
    const result = categories.reduce((acc, category) => {
      if (!category.parentId) {
        // Nếu là danh mục cha
        acc.push({
          ...category.toJSON(),
          children: categories
            .filter((child) => child.parentId === category.id)
            .map((child) => child.toJSON()),
        });
      }
      return acc;
    }, [] as any[]);

    // Step 4: Trả về danh sách danh mục đã được tổ chức
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Lấy danh mục cho navigation (danh mục cha và con)
/**
 * Lấy danh sách danh mục cho thanh điều hướng (navigation menu)
 * Flow:
 * Step 1: Lấy tất cả danh mục gốc (cha) có trạng thái active
 * Step 2: Sắp xếp danh mục cha theo tên (A-Z)
 * Step 3: Với mỗi danh mục cha, lấy tất cả danh mục con có trạng thái active
 * Step 4: Sắp xếp danh mục con theo tên (A-Z)
 * Step 5: Tổ chức dữ liệu thành cấu trúc phù hợp cho thanh điều hướng
 * Step 6: Trả về kết quả đã tổ chức
 */
export const getNavCategories = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Step 1: Lấy tất cả danh mục gốc (cha) có trạng thái active
    // Step 2: Sắp xếp danh mục cha theo tên (A-Z)
    const parentCategories = await Category.findAll({
      where: {
        parentId: null,
        isActive: true,
      },
      attributes: ["id", "name", "slug"],
      order: [["name", "ASC"]],
    });

    // Step 3: Với mỗi danh mục cha, lấy tất cả danh mục con có trạng thái active
    // Step 4: Sắp xếp danh mục con theo tên (A-Z)
    // Step 5: Tổ chức dữ liệu thành cấu trúc phù hợp cho thanh điều hướng
    const result = await Promise.all(
      parentCategories.map(async (parent) => {
        // Lấy tất cả danh mục con của danh mục cha hiện tại
        const childCategories = await Category.findAll({
          where: {
            parentId: parent.id,
            isActive: true,
          },
          attributes: ["id", "name", "slug"],
          order: [["name", "ASC"]],
        });

        return {
          id: parent.id,
          name: parent.name,
          slug: parent.slug,
          children: childCategories.map((child) => ({
            id: child.id,
            name: child.name,
            slug: child.slug,
          })),
        };
      })
    );

    // Step 6: Trả về kết quả đã tổ chức
    res.status(200).json(result);
  } catch (error: any) {
    console.error("Lỗi khi lấy danh mục cho navbar:", error);
    res.status(500).json({ message: error.message });
  }
};

// Lấy danh mục theo slug
/**
 * Lấy thông tin chi tiết của một danh mục theo slug
 * Flow:
 * Step 1: Lấy slug từ params request
 * Step 2: Truy vấn database để tìm danh mục theo slug
 * Step 3: Kèm theo các danh mục con nếu có (chỉ lấy những danh mục con có trạng thái active)
 * Step 4: Kiểm tra nếu không tìm thấy danh mục
 * Step 5: Trả về thông tin danh mục nếu tìm thấy
 */
export const getCategoryBySlug = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Step 1: Lấy slug từ params request
    const { slug } = req.params;

    // Step 2: Truy vấn database để tìm danh mục theo slug
    // Step 3: Kèm theo các danh mục con nếu có
    const category = await Category.findOne({
      where: { slug, isActive: true },
      attributes: [
        "id",
        "name",
        "slug",
        "description",
        "image",
        "parentId",
        "isActive",
      ],
      include: [
        {
          model: Category,
          as: "children",
          attributes: ["id", "name", "slug", "isActive"],
          where: { isActive: true },
          required: false,
        },
      ],
    });

    // Step 4: Kiểm tra nếu không tìm thấy danh mục
    if (!category) {
      res.status(404).json({ message: "Danh mục không tồn tại" });
      return;
    }

    // Step 5: Trả về thông tin danh mục nếu tìm thấy
    res.status(200).json(category);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// Lấy sản phẩm theo slug của danh mục
/**
 * Lấy danh sách sản phẩm theo slug của danh mục với nhiều tùy chọn lọc và phân trang
 * Flow:
 * Step 1: Lấy thông tin từ request (slug danh mục, tham số phân trang và lọc)
 * Step 2: Xử lý các tham số lọc (màu sắc, kích thước, thương hiệu, giá, v.v.)
 * Step 3: Nếu không có slug, trả về tất cả danh mục có trạng thái active
 * Step 4: Tìm danh mục theo slug
 * Step 5: Xác định các ID danh mục cần lọc (bao gồm cả danh mục con nếu cần)
 * Step 6: Xây dựng các điều kiện lọc cho sản phẩm (status, brand, featured)
 * Step 7: Xây dựng các điều kiện lọc cho chi tiết sản phẩm (màu sắc, giá)
 * Step 8: Xây dựng các điều kiện lọc cho tồn kho (kích thước)
 * Step 9: Xác định thứ tự sắp xếp
 * Step 10: Truy vấn database để lấy sản phẩm theo điều kiện
 * Step 11: Format dữ liệu sản phẩm để dễ sử dụng ở frontend
 * Step 12: Trả về kết quả bao gồm sản phẩm, thông tin phân trang, danh mục và bộ lọc
 */
export const getProductsByCategorySlug = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Step 1: Lấy thông tin từ request (slug danh mục, tham số phân trang và lọc)
    const { slug } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const offset = (page - 1) * limit;
    console.log("max price", req.query.maxPrice);

    // Step 2: Xử lý các tham số lọc
    const color = req.query.color as string;
    const sizeParam = req.query.size as string;
    const sizes = sizeParam ? sizeParam.split(",") : [];
    const brand = req.query.brand as string;
    const minPrice = parseFloat(req.query.minPrice as string) || 0;
    const maxPrice = parseFloat(req.query.maxPrice as string) || 9999999999;
    const featured = req.query.featured === "true" ? true : undefined;
    const sort = (req.query.sort as string) || "createdAt";

    const suitabilityParam = req.query.suitability as string;
    const suitabilities = suitabilityParam ? suitabilityParam.split(",") : [];
    const childCategorySlug = req.query.childCategory as string; // Step 3: Nếu không có slug thì lấy hết categories
    if (!slug) {
      const categories = await Category.findAll({
        where: { isActive: true },
        attributes: ["id", "name", "slug"],
      });
      res.status(200).json(categories);
      return;
    }

    // Step 4: Tìm category theo slug
    const category = await Category.findOne({
      where: { slug, isActive: true },
      include: [
        {
          model: Category,
          as: "parent",
          attributes: ["id", "name", "slug"],
          required: false,
        },
      ],
    });

    if (!category) {
      res.status(404).json({ message: "Danh mục không tồn tại" });
      return;
    }

    // Step 5: Xác định các ID danh mục cần lọc (bao gồm cả danh mục con nếu cần)
    let categoryIds = [category.id]; // Xử lý childCategorySlug
    if (category.parentId === null) {
      // Nếu là danh mục cha
      if (childCategorySlug) {
        // Step 5.1: Tìm danh mục con theo slug
        const childCategory = await Category.findOne({
          where: {
            slug: childCategorySlug,
            parentId: category.id,
            isActive: true,
          },
        });

        if (childCategory) {
          // Nếu tìm thấy, chỉ lọc theo danh mục con này
          console.log(
            `Tìm thấy danh mục con: ${childCategory.name} (ID: ${childCategory.id})`
          );
          categoryIds = [childCategory.id];
        } else {
          console.log(
            `Không tìm thấy danh mục con với slug: ${childCategorySlug}`
          );
        }
      } else {
        // Step 5.2: Nếu không có childCategorySlug, lấy tất cả sản phẩm của danh mục cha và con
        const childCategories = await Category.findAll({
          where: { parentId: category.id, isActive: true },
          attributes: ["id"],
        });
        categoryIds = [
          category.id,
          ...childCategories.map((child) => child.id),
        ];
      }
    } else {
      // Step 5.3: Nếu là danh mục con, chỉ lấy sản phẩm của danh mục này
      categoryIds = [category.id];
    }

    // Step 6: Xây dựng điều kiện lọc cho sản phẩm
    const productWhere: any = {
      status: { [Op.ne]: "draft" }, // Chỉ lấy sản phẩm không phải là bản nháp
    };
    if (brand) productWhere.brand = brand;
    if (featured !== undefined) productWhere.featured = featured;

    // Step 7: Xây dựng điều kiện lọc cho product details
    const detailWhere: any = {};
    if (color) detailWhere.color = color;

    // Xây dựng điều kiện giá
    if (minPrice > 0 || maxPrice < 9999999999) {
      detailWhere.price = {
        [Op.between]: [minPrice, maxPrice],
      };
    }

    // Step 8: Xây dựng điều kiện lọc cho inventories
    const inventoryWhere: any = {};
    if (sizes.length > 0) {
      inventoryWhere.size = { [Op.in]: sizes };
      inventoryWhere.stock = { [Op.gt]: 0 }; // Chỉ lấy size còn hàng
    }

    // Step 9: Xác định thứ tự sắp xếp
    let order: any[] = [];

    // Sắp xếp theo giá là trường hợp đặc biệt vì giá nằm trong ProductDetail
    if (sort) {
      const [field, direction] = sort.split("_");
      const validFields = ["name", "createdAt", "price", "featured"];
      const validDirections = ["asc", "desc"];

      if (
        validFields.includes(field) &&
        validDirections.includes(direction?.toLowerCase())
      ) {
        if (field === "price") {
          // Sắp xếp theo giá
          order = [
            [
              { model: ProductDetail, as: "details" },
              "price",
              direction.toUpperCase(),
            ],
          ];
        } else {
          order = [[field, direction.toUpperCase()]];
        }
      }
    }

    // Lấy sản phẩm theo danh mục với các điều kiện lọc
    const { count, rows: products } = await Product.findAndCountAll({
      where: productWhere,
      include: [
        {
          model: Category,
          as: "categories",
          where: { id: { [Op.in]: categoryIds } },
          attributes: ["id", "name", "slug"],
          through: { attributes: [] },
        },
        {
          model: ProductDetail,
          as: "details",
          attributes: ["id", "productId", "color", "price", "originalPrice"],
          where: Object.keys(detailWhere).length > 0 ? detailWhere : undefined,
          include: [
            {
              model: ProductInventory,
              as: "inventories",
              attributes: ["id", "productDetailId", "size", "stock"],
              where:
                Object.keys(inventoryWhere).length > 0
                  ? inventoryWhere
                  : undefined,
              required: sizes.length > 0, // Chỉ yêu cầu nếu có lọc size
            },
            {
              model: ProductImage,
              as: "images",
              attributes: ["id", "productDetailId", "url", "isMain"],
            },
          ],
          required: Object.keys(detailWhere).length > 0 || sizes.length > 0,
        },
        {
          model: Suitability,
          as: "suitabilities",
          attributes: ["id", "name"],
          through: { attributes: [] },
          required: suitabilities.length > 0,
          where:
            suitabilities.length > 0
              ? { name: { [Op.in]: suitabilities } }
              : undefined,
        },
      ],
      order,
      limit,
      offset,
      distinct: true,
    });

    // Format dữ liệu sản phẩm để dễ sử dụng ở frontend
    const formattedProducts = products.map((product) => {
      const productData = product.toJSON();

      // Tổng hợp thông tin màu sắc, kích thước, hình ảnh
      const colors = [
        ...new Set(productData.details.map((detail: any) => detail.color)),
      ];
      const sizes = [
        ...new Set(
          productData.details.flatMap((detail: any) =>
            detail.inventories.map((inv: any) => inv.size)
          )
        ),
      ];

      // Lấy hình ảnh chính
      const mainImages = productData.details
        .flatMap((detail: any) => detail.images)
        .filter((image: any) => image.isMain);

      // lấy thêm 1 ảnh phụ
      const subImage = productData.details
        .flatMap((detail: any) => detail.images)
        .filter((image: any) => !image.isMain)
        .slice(0, 1); // Lấy 1 ảnh phụ đầu tiên

      const mainImage = mainImages.length > 0 ? mainImages[0].url : null;

      // Tính giá thấp nhất, cao nhất
      const prices = productData.details.map((detail: any) => detail.price);
      const originalPrices = productData.details.map(
        (detail: any) => detail.originalPrice
      );
      const minProductPrice = Math.min(...prices);
      const maxProductPrice = Math.max(...prices);

      return {
        id: productData.id,
        name: productData.name,
        sku: productData.sku,
        slug: productData.slug,
        description: productData.description,
        brand: productData.brand,
        featured: productData.featured,
        status: productData.status,
        mainImage,
        subImage,
        price: prices.length === 1 ? prices[0] : null,
        originalPrice: originalPrices.length === 1 ? originalPrices[0] : null,
        activeRange:
          prices.length > 1
            ? {
                min: minProductPrice,
                max: maxProductPrice,
              }
            : null,
        colors,
        sizes,
        categories: productData.categories,
        suitabilities: productData.suitabilities || [],
        variants: productData.details.reduce((acc: any, detail: any) => {
          // Map các kích thước và tồn kho cho mỗi màu
          const sizeInventory = detail.inventories.reduce(
            (invAcc: any, inv: any) => {
              invAcc[inv.size] = inv.stock;
              return invAcc;
            },
            {}
          );

          // Lấy danh sách các kích thước có sẵn (còn hàng)
          const availableSizes = detail.inventories
            .filter((inv: any) => inv.stock > 0)
            .map((inv: any) => inv.size);

          // Lấy hình ảnh cho màu này
          const colorImages = detail.images.map((img: any) => ({
            id: img.id,
            url: img.url,
            isMain: img.isMain,
          }));

          // Thêm thông tin variant vào object
          acc[detail.color] = {
            id: detail.id,
            price: detail.price,
            originalPrice: detail.originalPrice,
            availableSizes,
            inventory: sizeInventory,
            images: colorImages,
          };

          return acc;
        }, {}),
      };
    });

    res.status(200).json({
      products: formattedProducts,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        image: category.image,
        parentCategory: category.parentId
          ? await Category.findByPk(category.parentId)
          : null,
      },
      filters: {
        availableColors: [
          ...new Set(
            products.flatMap((p) => (p.details ?? []).map((d) => d.color))
          ),
        ],
        availableSizes: [
          ...new Set(
            products.flatMap((p) =>
              (p.details || []).flatMap((d: any) =>
                (d.inventories || []).map((i: any) => i.size)
              )
            )
          ),
        ],
        activeRange: {
          min: Math.min(
            ...products.flatMap((p) => (p.details ?? []).map((d) => d.price))
          ),
          max: Math.max(
            ...products.flatMap((p) => (p.details ?? []).map((d) => d.price))
          ),
        },
        brands: [...new Set(products.map((p) => p.brand).filter(Boolean))],
        suitabilities: [
          ...new Set(
            products.flatMap((p) => (p.suitabilities || []).map((s) => s.name))
          ),
        ],
      },
    });
  } catch (error: any) {
    console.error("Lỗi khi lấy sản phẩm theo danh mục:", error);
    res.status(500).json({ message: error.message });
  }
};

// lấy các categories con của category cha
/**
 * Lấy danh sách các danh mục con của một danh mục cha
 * Flow:
 * Step 1: Lấy ID danh mục cha từ params request
 * Step 2: Truy vấn database để lấy tất cả danh mục con có parentId trùng với ID được cung cấp
 * Step 3: Chỉ lấy các danh mục con có trạng thái active
 * Step 4: Kiểm tra nếu không tìm thấy danh mục con nào
 * Step 5: Trả về danh sách danh mục con nếu tìm thấy
 */
export const getSubCategories = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Step 1: Lấy ID danh mục cha từ params request
    const { id } = req.params;

    // Step 2: Truy vấn database để lấy tất cả danh mục con có parentId trùng với ID được cung cấp
    // Step 3: Chỉ lấy các danh mục con có trạng thái active
    const subCategories = await Category.findAll({
      where: { parentId: id, isActive: true },
      attributes: ["id", "name", "slug"],
    });

    // Step 4: Kiểm tra nếu không tìm thấy danh mục con nào
    if (!subCategories) {
      res.status(404).json({ message: "Không tìm thấy danh mục con" });
      return;
    }

    // Step 5: Trả về danh sách danh mục con nếu tìm thấy
    res.status(200).json(subCategories);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get category breadcrumb path
 * Lấy đường dẫn breadcrumb cho danh mục
 * Flow:
 * Step 1: Lấy slug từ params request
 * Step 2: Truy vấn database để tìm danh mục theo slug
 * Step 3: Kiểm tra nếu không tìm thấy danh mục
 * Step 4: Tạo breadcrumb mặc định bắt đầu từ trang chủ
 * Step 5: Thêm danh mục cha vào breadcrumb nếu danh mục hiện tại là danh mục con
 * Step 6: Thêm danh mục hiện tại vào breadcrumb
 * Step 7: Trả về đường dẫn breadcrumb hoàn chỉnh
 */
export const getCategoryBreadcrumb = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Step 1: Lấy slug từ params request
    const { slug } = req.params;

    // Step 2: Truy vấn database để tìm danh mục theo slug
    const category = await Category.findOne({
      where: { slug },
      attributes: ["id", "name", "slug", "parentId"],
    });

    // Step 3: Kiểm tra nếu không tìm thấy danh mục
    if (!category) {
      res.status(404).json({ message: "Category not found" });
      return;
    }

    // Step 4: Tạo breadcrumb mặc định bắt đầu từ trang chủ
    const breadcrumb: { label: string; href: string; isLast?: boolean }[] = [
      { label: "Trang chủ", href: "/", isLast: false },
    ];

    // Step 5: Thêm danh mục cha vào breadcrumb nếu danh mục hiện tại là danh mục con
    if (category.parentId) {
      const parentCategory = await Category.findByPk(category.parentId, {
        attributes: ["id", "name", "slug"],
      });

      if (parentCategory) {
        breadcrumb.push({
          label: parentCategory.name,
          href: `/category/${parentCategory.slug}`,
        });
      }
    }

    // Step 6: Thêm danh mục hiện tại vào breadcrumb
    breadcrumb.push({
      label: category.name,
      href: `/category/${slug}`,
      isLast: true,
    });

    // Step 7: Trả về đường dẫn breadcrumb hoàn chỉnh
    res.status(200).json(breadcrumb);
  } catch (error: any) {
    console.error("Error generating category breadcrumb:", error);
    res.status(500).json({ message: error.message });
  }
};
