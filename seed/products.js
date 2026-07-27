const Category = require("../models/Category");
const Brand = require("../models/Brand");
const Product = require("../models/Product");

const DEMO_PRODUCTS = [
  {
    name: "iPhone 15 Pro Max",
    categoryName: "iPhones",
    brandName: "Apple",
    price: 1850000,
    discountPrice: 1750000,
    stock: 12,
    sku: "NG-IPH15PM-256",
    shortDescription: "Flagship iPhone with titanium design and pro camera system.",
    specifications: [
      { label: "Storage", value: "256GB" },
      { label: "Display", value: "6.7\" Super Retina XDR" },
    ],
    featured: true,
    newArrival: true,
    status: "active",
  },
  {
    name: "Samsung Galaxy S24 Ultra",
    categoryName: "Samsung Galaxy Phones",
    brandName: "Samsung",
    price: 1650000,
    stock: 8,
    sku: "NG-SGS24U-256",
    shortDescription: "Samsung's top-tier Galaxy with S Pen and AI camera features.",
    specifications: [
      { label: "Storage", value: "256GB" },
      { label: "Display", value: "6.8\" Dynamic AMOLED 2X" },
    ],
    trending: true,
    status: "active",
  },
  {
    name: "MacBook Pro 14-inch M3",
    categoryName: "MacBooks",
    brandName: "Apple",
    price: 2450000,
    stock: 5,
    sku: "NG-MBP14-M3-512",
    shortDescription: "Apple silicon MacBook Pro with M3 chip and Liquid Retina XDR display.",
    specifications: [
      { label: "Chip", value: "Apple M3" },
      { label: "Storage", value: "512GB SSD" },
    ],
    bestseller: true,
    status: "active",
  },
  {
    name: "Sony WH-1000XM5",
    categoryName: "Headphones",
    brandName: "Sony",
    price: 385000,
    discountPrice: 349000,
    stock: 20,
    sku: "NG-SONYWH1000XM5",
    shortDescription: "Industry-leading noise-cancelling wireless headphones.",
    flashSale: true,
    status: "active",
  },
];

async function seedProducts() {
  let created = 0;
  for (const p of DEMO_PRODUCTS) {
    const category = await Category.findOne({ name: p.categoryName });
    const brand = await Brand.findOne({ name: p.brandName });

    if (!category) {
      console.warn(`Skipping "${p.name}" — category "${p.categoryName}" not found (run categories seed first).`);
      continue;
    }

    await Product.findOneAndUpdate(
      { sku: p.sku },
      {
        name: p.name,
        category: category._id,
        brand: brand ? brand._id : undefined,
        price: p.price,
        discountPrice: p.discountPrice,
        stock: p.stock,
        sku: p.sku,
        shortDescription: p.shortDescription,
        specifications: p.specifications || [],
        featured: !!p.featured,
        trending: !!p.trending,
        flashSale: !!p.flashSale,
        newArrival: !!p.newArrival,
        bestseller: !!p.bestseller,
        status: p.status,
        // Real deployments upload via Cloudinary (Section 2.2); this local
        // path is a placeholder for seed/demo data only (Section 2.15).
        images: [`/images/products/${p.sku.toLowerCase()}.png`],
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
    created += 1;
  }
  console.log(`Products seeded/verified: ${created}/${DEMO_PRODUCTS.length}`);
}

module.exports = seedProducts;
