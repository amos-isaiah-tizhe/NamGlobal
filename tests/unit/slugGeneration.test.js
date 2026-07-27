const Category = require("../../models/Category");
const Brand = require("../../models/Brand");
const Product = require("../../models/Product");
const mongoose = require("mongoose");

/**
 * Mongoose's pre("validate") hooks (where slug generation happens) run
 * during `.validate()`, which does NOT require a database connection —
 * only `.save()` does. So slug-generation logic is testable here even
 * without a live MongoDB, unlike most of the rest of the app.
 */
describe("Slug auto-generation (Category/Brand/Product)", () => {
  test("Category generates a slug from its name", async () => {
    const category = new Category({ name: "Gaming Accessories" });
    await category.validate();
    expect(category.slug).toBe("gaming-accessories");
  });

  test("Brand generates a slug from its name", async () => {
    const brand = new Brand({ name: "Sony" });
    await brand.validate();
    expect(brand.slug).toBe("sony");
  });

  test("Product generates a slug from its name, including special characters", async () => {
    const product = new Product({
      name: "iPhone 15 Pro Max (256GB)",
      category: new mongoose.Types.ObjectId(),
      price: 100,
      sku: "TEST-SKU-1",
    });
    await product.validate();
    expect(product.slug).toBe("iphone-15-pro-max-256gb");
  });

  test("an explicitly-set slug is not overwritten", async () => {
    const category = new Category({ name: "Smartphones", slug: "custom-slug" });
    await category.validate();
    expect(category.slug).toBe("custom-slug");
  });

  test("Product validation fails without required fields (name, category, price, sku)", async () => {
    const product = new Product({});
    await expect(product.validate()).rejects.toThrow();
  });
});
