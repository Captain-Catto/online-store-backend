import sequelize from "../config/db";

// Cấu hình S3 URLs - THAY ĐỔI URL này theo bucket thực tế của bạn
const S3_BUCKET_URL = "https://shop-online-images.s3.ap-southeast-2.amazonaws.com";

// Danh sách sản phẩm với hình ảnh thực tế từ S3
const productData = [
  {
    name: "Áo Thun Nam Relaxed Fit",
    sku: "AT001",
    description: "Áo thun nam form relaxed fit, chất liệu cotton thoáng mát, phù hợp mặc hàng ngày",
    brand: "Fashion Store",
    material: "Cotton 100%",
    featured: true,
    categories: ["Thời trang nam", "Áo thun"],
    suitabilities: ["Nam"],
    variants: [
      {
        color: "Đen",
        price: 299000,
        originalPrice: 399000,
        images: [
          `${S3_BUCKET_URL}/1a8e8a22-ao_thun_relaxed_fit_in_vn_doc_lap_112_den_55.webp`
        ]
      },
      {
        color: "Trắng", 
        price: 299000,
        originalPrice: 399000,
        images: [
          `${S3_BUCKET_URL}/12740f69-ao_thun_relaxed_fit_in_vn_doc_lap_11_trang_78.jpg`,
          `${S3_BUCKET_URL}/5286cd29-ao_thun_relaxed_fit_in_vn_doc_lap_12_trang_96.jpg`
        ]
      },
      {
        color: "Be",
        price: 319000,
        originalPrice: 399000,
        images: [
          `${S3_BUCKET_URL}/481c9e24-ao_thun_relaxed_fit_in_vn_doc_lap_111_be_3_29.webp`
        ]
      }
    ],
    sizes: ["S", "M", "L", "XL"],
    stock: 50
  },
  
  {
    name: "Áo Sơ Mi Premium Poplin",
    sku: "ASM001", 
    description: "Áo sơ mi cao cấp chất liệu poplin, thiết kế cổ tàu hiện đại, phù hợp công sở",
    brand: "Premium Wear",
    material: "Poplin Cotton",
    featured: true,
    categories: ["Thời trang nam", "Áo sơ mi"],
    suitabilities: ["Nam"],
    variants: [
      {
        color: "Xanh Blue Night",
        price: 599000,
        originalPrice: 799000,
        images: [
          `${S3_BUCKET_URL}/03d52e48-ao_so_mi_dai_tay_co_tau_premium_poplin_mau_xanh_blue_night__11_.webp`,
          `${S3_BUCKET_URL}/31bc95c3-ao_so_mi_dai_tay_co_tau_premium_poplin_mau_xanh_blue_night__9_.webp`
        ]
      },
      {
        color: "Be", 
        price: 599000,
        originalPrice: 799000,
        images: [
          `${S3_BUCKET_URL}/050e5f96-ao_so_mi_dai_tay_co_tau_premium_poplin_mau_be__8_.webp`,
          `${S3_BUCKET_URL}/1f8bd1ae-ao_so_mi_dai_tay_co_tau_premium_poplin_mau_be__4_.webp`
        ]
      },
      {
        color: "Trắng",
        price: 599000,
        originalPrice: 799000,
        images: [
          `${S3_BUCKET_URL}/05526ff4-asmc_somi_cafe___5_trang.webp`,
          `${S3_BUCKET_URL}/138437ed-asmc_somi_cafe___3_trang.webp`
        ]
      }
    ],
    sizes: ["S", "M", "L", "XL"],
    stock: 30
  },

  {
    name: "Quần Kaki Excool Straight",
    sku: "QK001",
    description: "Quần kaki nam dáng straight, công nghệ Excool thoáng khí, chống nhăn",
    brand: "Smart Wear", 
    material: "Kaki Cotton Excool",
    featured: false,
    categories: ["Thời trang nam", "Quần dài"],
    suitabilities: ["Nam"],
    variants: [
      {
        color: "Đen",
        price: 499000,
        originalPrice: 699000,
        images: [
          `${S3_BUCKET_URL}/1c6fbf4a-quan_dai_nam_kaki_excool_dang_straight_den__7_.webp`,
          `${S3_BUCKET_URL}/646d2397-quan_dai_nam_kaki_excool_dang_straight_den__3_.webp`
        ]
      },
      {
        color: "Xám",
        price: 499000,
        originalPrice: 699000,
        images: [
          `${S3_BUCKET_URL}/16c58d77-quan_dai_nam_kaki_excool_dang_straight_xam__4_.webp`,
          `${S3_BUCKET_URL}/2e6c2e77-quan_dai_nam_kaki_excool_dang_straight_xam__2_.webp`
        ]
      }
    ],
    sizes: ["29", "30", "31", "32", "33", "34"],
    stock: 25
  },

  {
    name: "Áo Khoác Windbreaker Nylon",
    sku: "AK001",
    description: "Áo khoác windbreaker chất liệu nylon taslan, chống gió, chống nước nhẹ",
    brand: "Outdoor Pro",
    material: "Nylon Taslan", 
    featured: true,
    categories: ["Thời trang nam", "Áo khoác"],
    suitabilities: ["Nam"],
    variants: [
      {
        color: "Đen phối Xanh lá",
        price: 799000,
        originalPrice: 999000,
        images: [
          `${S3_BUCKET_URL}/001cc952-ao_khoac_windbreaker_nylon_taslan_den_phoi_xanh_la__10_.webp`,
          `${S3_BUCKET_URL}/071f3478-ao_khoac_windbreaker_nylon_taslan_den_phoi_xanh_la__1_.webp`
        ]
      },
      {
        color: "Navy phối Đen", 
        price: 799000,
        originalPrice: 999000,
        images: [
          `${S3_BUCKET_URL}/1b617da7-ao_khoac_windbreaker_nylon_taslan_navy_phoi_den__6_.webp`,
          `${S3_BUCKET_URL}/47521191-ao_khoac_windbreaker_nylon_taslan_navy_phoi_den__1_.webp`
        ]
      },
      {
        color: "Xám phối Trắng",
        price: 799000,
        originalPrice: 999000,
        images: [
          `${S3_BUCKET_URL}/0377d509-ao_khoac_windbreaker_nylon_taslan_xam_phoi_trang_.webp`,
          `${S3_BUCKET_URL}/38811f55-ao_khoac_windbreaker_nylon_taslan_xam_phoi_trang__3_.webp`
        ]
      }
    ],
    sizes: ["S", "M", "L", "XL"],
    stock: 20
  },

  {
    name: "Áo Thể Thao ProMax Sideflow",
    sku: "ATT001",
    description: "Áo thể thao nam công nghệ Sideflow, thoáng khí, quick-dry, phù hợp tập luyện",
    brand: "ProMax Sport",
    material: "Polyester Quick-Dry",
    featured: true,
    categories: ["Thời trang nam", "Áo thể thao"],
    suitabilities: ["Nam"],
    variants: [
      {
        color: "Trắng",
        price: 399000,
        originalPrice: 499000,
        images: [
          `${S3_BUCKET_URL}/0515b704-t_shirt_the_thao_nam_promax_sideflow_v_neck_trang_7.webp`,
          `${S3_BUCKET_URL}/271b6716-t_shirt_the_thao_nam_promax_sideflow_v_neck_trang_5.webp`
        ]
      },
      {
        color: "Đen",
        price: 399000,
        originalPrice: 499000,
        images: [
          `${S3_BUCKET_URL}/710ca756-t_shirt_the_thao_nam_promax_sideflow_v_neck_den_42.webp`,
          `${S3_BUCKET_URL}/859d1ea4-t_shirt_the_thao_nam_promax_sideflow_v_neck_den_3.webp`
        ]
      },
      {
        color: "Xanh Bóng Đêm",
        price: 429000,
        originalPrice: 499000,
        images: [
          `${S3_BUCKET_URL}/10a9d6ef-t_shirt_the_thao_nam_promax_sideflow_v_neck_2_xanh_bong_dem_89.webp`,
          `${S3_BUCKET_URL}/2ecec548-t_shirt_the_thao_nam_promax_sideflow_v_neck_1_xanh_bong_dem_18.webp`
        ]
      }
    ],
    sizes: ["S", "M", "L", "XL"],
    stock: 40
  },

  {
    name: "Quần Shorts Daily Wear",
    sku: "QS001",
    description: "Quần shorts nam hàng ngày, chất liệu thoáng mát, phù hợp mặc nhà và dạo phố",
    brand: "Daily Comfort",
    material: "Cotton Blend",
    featured: false,
    categories: ["Thời trang nam", "Quần shorts"],
    suitabilities: ["Nam"],
    variants: [
      {
        color: "Đen",
        price: 199000,
        originalPrice: 299000,
        images: [
          `${S3_BUCKET_URL}/0f37a433-quan_shorts_nam_daily_short_mau_den__2_.jpg`,
          `${S3_BUCKET_URL}/61c98894-quan_shorts_nam_daily_short_mau_den__3_.webp`
        ]
      },
      {
        color: "Xanh Navy",
        price: 199000,
        originalPrice: 299000,
        images: [
          `${S3_BUCKET_URL}/35d3d9a4-quan_shorts_nam_daily_short_mau_xanh_navy__9_.webp`,
          `${S3_BUCKET_URL}/87fd3155-quan_shorts_nam_daily_short_mau_xanh_navy__5_.webp`
        ]
      }
    ],
    sizes: ["S", "M", "L", "XL"],
    stock: 35
  }
];

// Function để seed dữ liệu
export const seedDetailedClothingData = async () => {
  const transaction = await sequelize.transaction();

  try {
    console.log("🌱 Bắt đầu seed dữ liệu chi tiết với hình ảnh S3...");

    // 1. Tạo categories
    const categoryNames = ["Thời trang nam", "Thời trang nữ", "Áo thun", "Áo sơ mi", "Quần dài", "Áo khoác", "Áo thể thao", "Quần shorts"];
    for (const categoryName of categoryNames) {
      await sequelize.query(`
        INSERT IGNORE INTO categories (name, slug, description, isActive, createdAt, updatedAt) VALUES
        ('${categoryName}', '${categoryName.toLowerCase().replace(/ /g, "-")}', 'Danh mục ${categoryName}', 1, NOW(), NOW())
      `, { transaction });
    }

    // 2. Tạo suitabilities
    await sequelize.query(`
      INSERT IGNORE INTO suitabilities (name, description, createdAt, updatedAt) VALUES
      ('Nam', 'Phù hợp cho nam giới', NOW(), NOW()),
      ('Nữ', 'Phù hợp cho nữ giới', NOW(), NOW())
    `, { transaction });

    // 3. Tạo từng sản phẩm
    for (const product of productData) {
      console.log(`📦 Đang tạo sản phẩm: ${product.name}`);

      // Tạo sản phẩm chính
      await sequelize.query(`
        INSERT INTO products (name, sku, description, brand, material, featured, tags, createdAt, updatedAt) VALUES
        ('${product.name}', '${product.sku}', '${product.description}', '${product.brand}', '${product.material}', ${product.featured}, '${product.name.toLowerCase()}', NOW(), NOW())
      `, { transaction });

      const [[{ productId }]] = await sequelize.query(`SELECT LAST_INSERT_ID() as productId`, { transaction });

      // Liên kết với categories
      for (const categoryName of product.categories) {
        await sequelize.query(`
          INSERT INTO product_categories (productId, categoryId)
          SELECT ${productId}, id FROM categories WHERE name = '${categoryName}' LIMIT 1
        `, { transaction });
      }

      // Liên kết với suitabilities
      for (const suitabilityName of product.suitabilities) {
        await sequelize.query(`
          INSERT INTO product_suitabilities (productId, suitabilityId, createdAt, updatedAt)
          SELECT ${productId}, id, NOW(), NOW() FROM suitabilities WHERE name = '${suitabilityName}' LIMIT 1
        `, { transaction });
      }

      // Tạo variants và hình ảnh
      for (const variant of product.variants) {
        await sequelize.query(`
          INSERT INTO product_details (productId, color, price, originalPrice, createdAt, updatedAt) VALUES
          (${productId}, '${variant.color}', ${variant.price}, ${variant.originalPrice}, NOW(), NOW())
        `, { transaction });

        const [[{ detailId }]] = await sequelize.query(`SELECT LAST_INSERT_ID() as detailId`, { transaction });

        // Thêm hình ảnh cho variant
        for (let i = 0; i < variant.images.length; i++) {
          await sequelize.query(`
            INSERT INTO product_images (productDetailId, url, isMain, displayOrder, createdAt, updatedAt) VALUES
            (${detailId}, '${variant.images[i]}', ${i === 0 ? 1 : 0}, ${i}, NOW(), NOW())
          `, { transaction });
        }

        // Tạo inventory cho tất cả sizes
        for (const size of product.sizes) {
          await sequelize.query(`
            INSERT INTO product_inventories (productDetailId, size, stock, createdAt, updatedAt) VALUES
            (${detailId}, '${size}', ${product.stock}, NOW(), NOW())
          `, { transaction });
        }
      }

      console.log(`✅ Hoàn thành sản phẩm: ${product.name} (${product.variants.length} variants)`);
    }

    await transaction.commit();
    console.log("🎉 Seed dữ liệu thành công!");
    console.log(`📊 Đã tạo ${productData.length} sản phẩm với hình ảnh thực tế từ S3`);
    console.log("🔗 Tất cả sản phẩm đều có đầy đủ variants, hình ảnh và inventory");

  } catch (error) {
    await transaction.rollback();
    console.error("❌ Lỗi khi seed dữ liệu:", error);
    throw error;
  }
};

export default seedDetailedClothingData;