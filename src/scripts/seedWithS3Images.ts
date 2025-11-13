import sequelize from "../config/db";

// Cấu hình S3 URLs - Sử dụng hình ảnh thực tế đã có trên bucket
const S3_BUCKET_URL = "https://your-bucket-name.s3.amazonaws.com"; // Thay bằng URL bucket thực tế

// Danh sách URLs hình ảnh thực tế từ S3 bucket của bạn
const imageUrls = {
  // Áo thun nam - các màu khác nhau
  tshirts: [
    `${S3_BUCKET_URL}/001cc952-ao_khoac_windbreaker_nylon_taslan_den_phoi_xanh_la__10_.webp`, // Áo khoác đen
    `${S3_BUCKET_URL}/12740f69-ao_thun_relaxed_fit_in_vn_doc_lap_11_trang_78.jpg`, // Áo thun trắng
    `${S3_BUCKET_URL}/1a8e8a22-ao_thun_relaxed_fit_in_vn_doc_lap_112_den_55.webp`, // Áo thun đen
    `${S3_BUCKET_URL}/481c9e24-ao_thun_relaxed_fit_in_vn_doc_lap_111_be_3_29.webp`, // Áo thun be
    `${S3_BUCKET_URL}/5286cd29-ao_thun_relaxed_fit_in_vn_doc_lap_12_trang_96.jpg`, // Áo thun trắng 2
    `${S3_BUCKET_URL}/89142f22-ao_thun_relaxed_fit_in_vn_doc_lap_13_trang_42.jpg` // Áo thun trắng 3
  ],
  
  // Áo sơ mi - các màu và style khác nhau
  shirts: [
    `${S3_BUCKET_URL}/03d52e48-ao_so_mi_dai_tay_co_tau_premium_poplin_mau_xanh_blue_night__11_.webp`, // Sơ mi xanh navy
    `${S3_BUCKET_URL}/050e5f96-ao_so_mi_dai_tay_co_tau_premium_poplin_mau_be__8_.webp`, // Sơ mi be
    `${S3_BUCKET_URL}/05526ff4-asmc_somi_cafe___5_trang.webp`, // Sơ mi trắng
    `${S3_BUCKET_URL}/05946238-asmc_somi_cafe___28_xn.webp`, // Sơ mi xanh nhạt
    `${S3_BUCKET_URL}/138437ed-asmc_somi_cafe___3_trang.webp`, // Sơ mi trắng 2
    `${S3_BUCKET_URL}/17aa8fe4-asmc_somi_cafe___14_xd.webp` // Sơ mi xanh đậm
  ],
  
  // Quần - jean, kaki, shorts
  pants: [
    `${S3_BUCKET_URL}/03598769-quan_dai_kaki_ecc_pants_den__8_.jpg`, // Quần kaki đen
    `${S3_BUCKET_URL}/0e074703-quan_dai_kaki_ecc_pants_xam__7_.webp`, // Quần kaki xám
    `${S3_BUCKET_URL}/16c58d77-quan_dai_nam_kaki_excool_dang_straight_xam__4_.webp`, // Quần kaki xám straight
    `${S3_BUCKET_URL}/1c6fbf4a-quan_dai_nam_kaki_excool_dang_straight_den__7_.webp`, // Quần kaki đen straight
    `${S3_BUCKET_URL}/07e6a04a-quan_chino_nam_7_inch_405_trang_98.webp`, // Chino trắng
    `${S3_BUCKET_URL}/191c2f85-quan_chino_nam_7_inch_485_den.webp` // Chino đen
  ],
  
  // Áo khoác
  jackets: [
    `${S3_BUCKET_URL}/0377d509-ao_khoac_windbreaker_nylon_taslan_xam_phoi_trang_.webp`, // Windbreaker xám
    `${S3_BUCKET_URL}/071f3478-ao_khoac_windbreaker_nylon_taslan_den_phoi_xanh_la__1_.webp`, // Windbreaker đen
    `${S3_BUCKET_URL}/1b617da7-ao_khoac_windbreaker_nylon_taslan_navy_phoi_den__6_.webp`, // Windbreaker navy
    `${S3_BUCKET_URL}/4dbe00e2-ao_khoac_mu_daily_wear_den_5_17.webp`, // Áo khoác hoodie đen
    `${S3_BUCKET_URL}/58b1d6d3-ao_khoac_mu_daily_wear_den_7_87.webp` // Áo khoác hoodie đen 2
  ],
  
  // Quần shorts
  shorts: [
    `${S3_BUCKET_URL}/0f37a433-quan_shorts_nam_daily_short_mau_den__2_.jpg`, // Shorts đen
    `${S3_BUCKET_URL}/35d3d9a4-quan_shorts_nam_daily_short_mau_xanh_navy__9_.webp`, // Shorts navy
    `${S3_BUCKET_URL}/0966bd98-quan_nam_travel_short_7_inch_den_4.webp`, // Travel shorts đen
    `${S3_BUCKET_URL}/32404fb4-quan_nam_travel_short_7_inch_xam_6.webp`, // Travel shorts xám
    `${S3_BUCKET_URL}/7a107731-quan_nam_travel_short_7_inch_den_5.webp` // Travel shorts đen 2
  ],
  
  // Áo thể thao
  sportswear: [
    `${S3_BUCKET_URL}/0515b704-t_shirt_the_thao_nam_promax_sideflow_v_neck_trang_7.webp`, // Áo thể thao trắng
    `${S3_BUCKET_URL}/10a9d6ef-t_shirt_the_thao_nam_promax_sideflow_v_neck_2_xanh_bong_dem_89.webp`, // Áo thể thao xanh
    `${S3_BUCKET_URL}/271b6716-t_shirt_the_thao_nam_promax_sideflow_v_neck_trang_5.webp`, // Áo thể thao trắng 2
    `${S3_BUCKET_URL}/710ca756-t_shirt_the_thao_nam_promax_sideflow_v_neck_den_42.webp`, // Áo thể thao đen
    `${S3_BUCKET_URL}/859d1ea4-t_shirt_the_thao_nam_promax_sideflow_v_neck_den_3.webp` // Áo thể thao đen 2
  ]
};

// Script seed data với SQL raw queries
export const seedClothingDataWithS3 = async () => {
  const transaction = await sequelize.transaction();

  try {
    console.log("🌱 Bắt đầu seed dữ liệu với hình ảnh S3...");

    // 1. Tạo categories
    await sequelize.query(`
      INSERT IGNORE INTO categories (name, slug, description, status, created_at, updated_at) VALUES
      ('Thời trang nam', 'thoi-trang-nam', 'Danh mục thời trang dành cho nam', 'active', NOW(), NOW()),
      ('Thời trang nữ', 'thoi-trang-nu', 'Danh mục thời trang dành cho nữ', 'active', NOW(), NOW()),
      ('Áo thun', 'ao-thun', 'Danh mục áo thun', 'active', NOW(), NOW()),
      ('Quần jean', 'quan-jean', 'Danh mục quần jean', 'active', NOW(), NOW()),
      ('Áo sơ mi', 'ao-so-mi', 'Danh mục áo sơ mi', 'active', NOW(), NOW()),
      ('Váy', 'vay', 'Danh mục váy', 'active', NOW(), NOW())
    `, { transaction });

    // 2. Tạo suitabilities  
    await sequelize.query(`
      INSERT IGNORE INTO suitabilities (name, description, created_at, updated_at) VALUES
      ('Nam', 'Phù hợp cho nam giới', NOW(), NOW()),
      ('Nữ', 'Phù hợp cho nữ giới', NOW(), NOW())
    `, { transaction });

    // 3. Tạo sản phẩm 1: Áo Thun Nam Basic
    const [productResult1] = await sequelize.query(`
      INSERT INTO products (name, sku, description, brand, material, featured, status, tags, created_at, updated_at) VALUES
      ('Áo Thun Nam Basic', 'TSM001', 'Áo thun nam basic, chất liệu cotton 100%, thoáng mát và thoải mái', 'Fashion Store', 'Cotton 100%', true, 'active', 'áo thun, nam, basic, cotton', NOW(), NOW())
    `, { transaction });
    
    const productId1 = (productResult1 as any).insertId;

    // Liên kết với categories
    await sequelize.query(`
      INSERT INTO product_categories (product_id, category_id, created_at, updated_at) 
      SELECT ${productId1}, id, NOW(), NOW() FROM categories WHERE name IN ('Thời trang nam', 'Áo thun')
    `, { transaction });

    // Liên kết với suitabilities
    await sequelize.query(`
      INSERT INTO product_suitabilities (product_id, suitability_id, created_at, updated_at)
      SELECT ${productId1}, id, NOW(), NOW() FROM suitabilities WHERE name = 'Nam'
    `, { transaction });

    // Tạo product details cho áo thun (3 màu)
    const variants1 = [
      { color: 'Đen', price: 299000, originalPrice: 399000, images: [imageUrls.tshirts[2], imageUrls.tshirts[0]] },
      { color: 'Trắng', price: 299000, originalPrice: 399000, images: [imageUrls.tshirts[1], imageUrls.tshirts[4]] }, 
      { color: 'Be', price: 329000, originalPrice: 399000, images: [imageUrls.tshirts[3], imageUrls.tshirts[5]] }
    ];

    for (const variant of variants1) {
      const [detailResult] = await sequelize.query(`
        INSERT INTO product_details (product_id, color, price, original_price, created_at, updated_at) VALUES
        (${productId1}, '${variant.color}', ${variant.price}, ${variant.originalPrice}, NOW(), NOW())
      `, { transaction });
      
      const detailId = (detailResult as any).insertId;

      // Thêm hình ảnh cho variant
      for (let i = 0; i < variant.images.length; i++) {
        if (variant.images[i]) {
          await sequelize.query(`
            INSERT INTO product_images (product_detail_id, url, is_main, display_order, created_at, updated_at) VALUES
            (${detailId}, '${variant.images[i]}', ${i === 0 ? 'true' : 'false'}, ${i}, NOW(), NOW())
          `, { transaction });
        }
      }

      // Tạo inventory cho các sizes
      const sizes = ['S', 'M', 'L', 'XL'];
      for (const size of sizes) {
        await sequelize.query(`
          INSERT INTO product_inventories (product_detail_id, size, stock, created_at, updated_at) VALUES
          (${detailId}, '${size}', 50, NOW(), NOW())
        `, { transaction });
      }
    }

    // 4. Tạo sản phẩm 2: Quần Jean Nam
    const [productResult2] = await sequelize.query(`
      INSERT INTO products (name, sku, description, brand, material, featured, status, tags, created_at, updated_at) VALUES
      ('Quần Jean Nam Skinny', 'JNM001', 'Quần jean nam form skinny, chất liệu denim cao cấp, co giãn nhẹ', 'Fashion Store', 'Denim cotton pha elastane', false, 'active', 'quần jean, nam, skinny, denim', NOW(), NOW())
    `, { transaction });
    
    const productId2 = (productResult2 as any).insertId;

    // Liên kết categories và suitabilities cho jean
    await sequelize.query(`
      INSERT INTO product_categories (product_id, category_id, created_at, updated_at) 
      SELECT ${productId2}, id, NOW(), NOW() FROM categories WHERE name IN ('Thời trang nam', 'Quần jean')
    `, { transaction });

    await sequelize.query(`
      INSERT INTO product_suitabilities (product_id, suitability_id, created_at, updated_at)
      SELECT ${productId2}, id, NOW(), NOW() FROM suitabilities WHERE name = 'Nam'
    `, { transaction });

    // Tạo variants cho quần kaki/chino (3 màu)
    const variants2 = [
      { color: 'Đen', price: 599000, originalPrice: 799000, images: [imageUrls.pants[0], imageUrls.pants[5]] },
      { color: 'Xám', price: 629000, originalPrice: 799000, images: [imageUrls.pants[1], imageUrls.pants[2]] },
      { color: 'Trắng', price: 599000, originalPrice: 799000, images: [imageUrls.pants[4]] }
    ];

    for (const variant of variants2) {
      const [detailResult] = await sequelize.query(`
        INSERT INTO product_details (product_id, color, price, original_price, created_at, updated_at) VALUES
        (${productId2}, '${variant.color}', ${variant.price}, ${variant.originalPrice}, NOW(), NOW())
      `, { transaction });
      
      const detailId = (detailResult as any).insertId;

      // Thêm hình ảnh cho variant
      for (let i = 0; i < variant.images.length; i++) {
        if (variant.images[i]) {
          await sequelize.query(`
            INSERT INTO product_images (product_detail_id, url, is_main, display_order, created_at, updated_at) VALUES
            (${detailId}, '${variant.images[i]}', ${i === 0 ? 'true' : 'false'}, ${i}, NOW(), NOW())
          `, { transaction });
        }
      }

      // Tạo inventory cho jean sizes
      const jeanSizes = ['29', '30', '31', '32', '33'];
      for (const size of jeanSizes) {
        await sequelize.query(`
          INSERT INTO product_inventories (product_detail_id, size, stock, created_at, updated_at) VALUES
          (${detailId}, '${size}', 25, NOW(), NOW())
        `, { transaction });
      }
    }

    // 5. Tạo thêm sản phẩm khác tương tự...
    // Bạn có thể thêm nhiều sản phẩm khác theo pattern này

    await transaction.commit();
    console.log("✅ Seed dữ liệu thành công!");
    console.log("📊 Đã tạo:");
    console.log("   - 6 categories");
    console.log("   - 2 suitabilities"); 
    console.log("   - 2 sản phẩm với variants và hình ảnh từ S3");
    console.log("   - Đầy đủ inventory cho tất cả sizes");

  } catch (error) {
    await transaction.rollback();
    console.error("❌ Lỗi khi seed dữ liệu:", error);
    throw error;
  }
};

// Export function để có thể import từ nơi khác
export default seedClothingDataWithS3;