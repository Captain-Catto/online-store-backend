import sequelize from "../config/db";
import Product from "../models/Product";
import ProductDetail from "../models/ProductDetail";
import ProductImage from "../models/ProductImage";
import ProductInventory from "../models/ProductInventory";
import ProductCategory from "../models/ProductCategory";
import Category from "../models/Category";
import Suitability from "../models/Suitability";
import ProductSuitability from "../models/ProductSuitability";

// Import để sử dụng require và process
declare const require: any;
declare const process: any;
declare const module: any;

// Danh sách hình ảnh quần áo có sẵn trên S3
// Thay thế bằng URLs thực tế của hình ảnh trên S3 bucket của bạn
const S3_BASE_URL = "https://your-bucket-name.s3.amazonaws.com"; // Thay đổi này

const clothingImages = {
  // Áo thun nam
  tshirt_men: [
    `${S3_BASE_URL}/products/tshirt-men-black-front.jpg`,
    `${S3_BASE_URL}/products/tshirt-men-black-back.jpg`,
    `${S3_BASE_URL}/products/tshirt-men-white-front.jpg`,
    `${S3_BASE_URL}/products/tshirt-men-white-back.jpg`,
    `${S3_BASE_URL}/products/tshirt-men-navy-front.jpg`,
  ],
  // Áo thun nữ
  tshirt_women: [
    `${S3_BASE_URL}/products/tshirt-women-pink-front.jpg`,
    `${S3_BASE_URL}/products/tshirt-women-pink-back.jpg`,
    `${S3_BASE_URL}/products/tshirt-women-white-front.jpg`,
    `${S3_BASE_URL}/products/tshirt-women-purple-front.jpg`,
  ],
  // Quần jean nam
  jeans_men: [
    `${S3_BASE_URL}/products/jeans-men-blue-front.jpg`,
    `${S3_BASE_URL}/products/jeans-men-blue-back.jpg`,
    `${S3_BASE_URL}/products/jeans-men-black-front.jpg`,
    `${S3_BASE_URL}/products/jeans-men-black-back.jpg`,
  ],
  // Áo sơ mi
  shirt: [
    `${S3_BASE_URL}/products/shirt-white-front.jpg`,
    `${S3_BASE_URL}/products/shirt-white-back.jpg`,
    `${S3_BASE_URL}/products/shirt-blue-front.jpg`,
    `${S3_BASE_URL}/products/shirt-striped-front.jpg`,
  ],
  // Váy nữ
  dress: [
    `${S3_BASE_URL}/products/dress-floral-front.jpg`,
    `${S3_BASE_URL}/products/dress-floral-back.jpg`,
    `${S3_BASE_URL}/products/dress-black-front.jpg`,
    `${S3_BASE_URL}/products/dress-summer-front.jpg`,
  ]
};

// Dữ liệu sản phẩm mẫu
const sampleProducts = [
  {
    name: "Áo Thun Nam Basic",
    sku: "TSM001",
    description: "Áo thun nam basic, chất liệu cotton 100%, thoáng mát và thoải mái",
    brand: "Fashion Store",
    material: "Cotton 100%",
    featured: true,
    status: "active",
    tags: "áo thun, nam, basic, cotton",
    categories: ["Thời trang nam", "Áo thun"],
    suitabilities: ["Nam"],
    variants: [
      { color: "Đen", price: 299000, originalPrice: 399000, images: clothingImages.tshirt_men.slice(0, 2) },
      { color: "Trắng", price: 299000, originalPrice: 399000, images: clothingImages.tshirt_men.slice(2, 4) },
      { color: "Xanh navy", price: 329000, originalPrice: 399000, images: [clothingImages.tshirt_men[4]] }
    ],
    sizes: ["S", "M", "L", "XL"],
    stockPerVariant: 50
  },
  {
    name: "Áo Thun Nữ Oversize",
    sku: "TSW001", 
    description: "Áo thun nữ form oversize, phong cách trẻ trung, năng động",
    brand: "Fashion Store",
    material: "Cotton pha spandex",
    featured: true,
    status: "active",
    tags: "áo thun, nữ, oversize, trendy",
    categories: ["Thời trang nữ", "Áo thun"],
    suitabilities: ["Nữ"],
    variants: [
      { color: "Hồng", price: 249000, originalPrice: 319000, images: clothingImages.tshirt_women.slice(0, 2) },
      { color: "Trắng", price: 249000, originalPrice: 319000, images: [clothingImages.tshirt_women[2]] },
      { color: "Tím", price: 269000, originalPrice: 319000, images: [clothingImages.tshirt_women[3]] }
    ],
    sizes: ["S", "M", "L"],
    stockPerVariant: 30
  },
  {
    name: "Quần Jean Nam Skinny",
    sku: "JNM001",
    description: "Quần jean nam form skinny, chất liệu denim cao cấp, co giãn nhẹ",
    brand: "Fashion Store", 
    material: "Denim cotton pha elastane",
    featured: false,
    status: "active",
    tags: "quần jean, nam, skinny, denim",
    categories: ["Thời trang nam", "Quần jean"],
    suitabilities: ["Nam"],
    variants: [
      { color: "Xanh", price: 599000, originalPrice: 799000, images: clothingImages.jeans_men.slice(0, 2) },
      { color: "Đen", price: 629000, originalPrice: 799000, images: clothingImages.jeans_men.slice(2, 4) }
    ],
    sizes: ["29", "30", "31", "32", "33"],
    stockPerVariant: 25
  },
  {
    name: "Áo Sơ Mi Công Sở",
    sku: "SMC001",
    description: "Áo sơ mi công sở form regular, phù hợp môi trường văn phòng",
    brand: "Professional Wear",
    material: "Cotton pha polyester",
    featured: false,
    status: "active", 
    tags: "áo sơ mi, công sở, formal, professional",
    categories: ["Thời trang nam", "Áo sơ mi"],
    suitabilities: ["Nam", "Nữ"],
    variants: [
      { color: "Trắng", price: 449000, originalPrice: 599000, images: clothingImages.shirt.slice(0, 2) },
      { color: "Xanh nhạt", price: 449000, originalPrice: 599000, images: [clothingImages.shirt[2]] },
      { color: "Sọc xanh", price: 479000, originalPrice: 599000, images: [clothingImages.shirt[3]] }
    ],
    sizes: ["S", "M", "L", "XL"],
    stockPerVariant: 40
  },
  {
    name: "Váy Hoa Mùa Hè",
    sku: "VNH001",
    description: "Váy hoa nhẹ nhàng, phù hợp mùa hè, thiết kế nữ tính",
    brand: "Summer Collection",
    material: "Vải voan cotton",
    featured: true,
    status: "active",
    tags: "váy, hoa, mùa hè, nữ tính",
    categories: ["Thời trang nữ", "Váy"],
    suitabilities: ["Nữ"], 
    variants: [
      { color: "Hoa nhí", price: 399000, originalPrice: 499000, images: clothingImages.dress.slice(0, 2) },
      { color: "Đen", price: 429000, originalPrice: 499000, images: [clothingImages.dress[2]] },
      { color: "Hè phong", price: 399000, originalPrice: 499000, images: [clothingImages.dress[3]] }
    ],
    sizes: ["S", "M", "L"],
    stockPerVariant: 20
  }
];

export const seedClothingData = async () => {
  try {
    console.log("🌱 Bắt đầu seed dữ liệu quần áo...");
    
    const transaction = await sequelize.transaction();
    
    try {
      // 1. Tạo các categories nếu chưa có
      const categories = ["Thời trang nam", "Thời trang nữ", "Áo thun", "Quần jean", "Áo sơ mi", "Váy"];
      const categoryMap: { [key: string]: any } = {};
      
      for (const categoryName of categories) {
        let category = await Category.findOne({
          where: { name: categoryName },
          transaction
        });
        
        if (!category) {
          category = await Category.build({
            name: categoryName,
            slug: categoryName.toLowerCase().replace(/ /g, "-"),
            description: `Danh mục ${categoryName}`,
            status: "active"
          }).save({ transaction });
        }
        
        categoryMap[categoryName] = category;
      }
      
      // 2. Tạo các suitabilities nếu chưa có
      const suitabilities = ["Nam", "Nữ"];
      const suitabilityMap: { [key: string]: any } = {};
      
      for (const suitabilityName of suitabilities) {
        const [suitability] = await Suitability.findOrCreate({
          where: { name: suitabilityName },
          defaults: {
            name: suitabilityName,
            description: `Phù hợp cho ${suitabilityName.toLowerCase()}`
          },
          transaction
        });
        suitabilityMap[suitabilityName] = suitability;
      }
      
      // 3. Tạo các sản phẩm
      for (const productData of sampleProducts) {
        console.log(`📦 Đang tạo sản phẩm: ${productData.name}`);
        
        // Tạo product chính
        const product = await Product.create({
          name: productData.name,
          sku: productData.sku,
          description: productData.description,
          brand: productData.brand,
          material: productData.material,
          featured: productData.featured,
          status: productData.status,
          tags: productData.tags
        }, { transaction });
        
        // Liên kết với categories
        for (const categoryName of productData.categories) {
          if (categoryMap[categoryName]) {
            await ProductCategory.create({
              productId: product.id,
              categoryId: categoryMap[categoryName].id
            }, { transaction });
          }
        }
        
        // Liên kết với suitabilities
        for (const suitabilityName of productData.suitabilities) {
          if (suitabilityMap[suitabilityName]) {
            await ProductSuitability.create({
              productId: product.id,
              suitabilityId: suitabilityMap[suitabilityName].id
            }, { transaction });
          }
        }
        
        // Tạo product details (variants) và images
        for (const variant of productData.variants) {
          const productDetail = await ProductDetail.create({
            productId: product.id,
            color: variant.color,
            price: variant.price,
            originalPrice: variant.originalPrice
          }, { transaction });
          
          // Tạo images cho variant này
          for (let i = 0; i < variant.images.length; i++) {
            await ProductImage.create({
              productDetailId: productDetail.id,
              url: variant.images[i],
              isMain: i === 0, // Hình đầu tiên là hình chính
              displayOrder: i
            }, { transaction });
          }
          
          // Tạo inventory cho tất cả sizes
          for (const size of productData.sizes) {
            await ProductInventory.create({
              productDetailId: productDetail.id,
              size: size,
              stock: productData.stockPerVariant
            }, { transaction });
          }
        }
        
        console.log(`✅ Đã tạo sản phẩm: ${productData.name} với ${productData.variants.length} variants`);
      }
      
      await transaction.commit();
      console.log("🎉 Seed dữ liệu thành công!");
      console.log(`📊 Đã tạo ${sampleProducts.length} sản phẩm với hình ảnh từ S3`);
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error("❌ Lỗi khi seed dữ liệu:", error);
    throw error;
  }
};

// Chạy script
if (require.main === module) {
  seedClothingData()
    .then(() => {
      console.log("✅ Script hoàn thành");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Script thất bại:", error);
      process.exit(1);
    });
}