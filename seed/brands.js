const Brand = require("../models/Brand");

const BRAND_NAMES = ["Apple", "Samsung", "Google", "Tecno", "Infinix", "Xiaomi", "Sony", "Microsoft"];

async function seedBrands() {
  let count = 0;
  for (const name of BRAND_NAMES) {
    await Brand.findOneAndUpdate({ name }, { name }, { upsert: true, setDefaultsOnInsert: true });
    count += 1;
  }
  console.log(`Brands seeded/verified: ${count}/${BRAND_NAMES.length}`);
}

module.exports = seedBrands;
