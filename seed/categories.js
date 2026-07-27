const Category = require("../models/Category");

// Section 1.2 — initial catalog categories. Architecture supports unlimited
// future categories added via the admin dashboard (Stage 8); this list only
// seeds the starting set.
const CATEGORY_NAMES = [
  "Smartphones",
  "iPhones",
  "Android Phones",
  "Samsung Galaxy Phones",
  "Google Pixel Phones",
  "Tecno Phones",
  "Infinix Phones",
  "Xiaomi Phones",
  "Other Smartphone Brands",
  "MacBooks",
  "Windows Laptops",
  "Tablets",
  "iPads",
  "Smartwatches",
  "PlayStation Consoles",
  "Xbox Consoles",
  "Nintendo Consoles",
  "Gaming Accessories",
  "Headphones",
  "Earbuds",
  "Bluetooth Speakers",
  "Phone Accessories",
  "Laptop Accessories",
  "Chargers and Adapters",
  "USB Cables",
  "Power Banks",
  "Phone Cases",
  "Screen Protectors",
  "Computer Accessories",
  "Cameras and Camera Accessories",
  "Smart Home Gadgets",
  "Other Consumer Electronics",
];

async function seedCategories() {
  let created = 0;
  for (const name of CATEGORY_NAMES) {
    const result = await Category.findOneAndUpdate(
      { name },
      { name },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    if (result) created += 1;
  }
  console.log(`Categories seeded/verified: ${created}/${CATEGORY_NAMES.length}`);
}

module.exports = seedCategories;
