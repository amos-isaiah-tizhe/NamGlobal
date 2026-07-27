const mongoose = require("mongoose");
const slugify = require("slugify");

const specificationSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const reviewRefSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, trim: true, maxlength: 2000 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String, trim: true },
    shortDescription: { type: String, trim: true, maxlength: 300 },

    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    brand: { type: mongoose.Schema.Types.ObjectId, ref: "Brand", index: true },

    price: { type: Number, required: true, min: 0, index: true },
    discountPrice: { type: Number, min: 0 },

    stock: { type: Number, required: true, min: 0, default: 0 },
    sku: { type: String, required: true, unique: true, trim: true, index: true },

    images: [{ type: String }], // Cloudinary URLs — first entry is the primary image
    gallery: [{ type: String }],
    videos: [{ type: String }],

    warranty: { type: String, trim: true }, // Section 1.7 warranty policy is the default; per-product override here
    specifications: [specificationSchema],
    features: [{ type: String, trim: true }],
    tags: [{ type: String, trim: true, index: true }],

    rating: { type: Number, min: 0, max: 5, default: 0 },
    reviews: [reviewRefSchema],

    status: {
      type: String,
      enum: ["draft", "active", "out_of_stock", "discontinued"],
      default: "draft",
      index: true,
    },

    featured: { type: Boolean, default: false, index: true },
    trending: { type: Boolean, default: false, index: true },
    flashSale: { type: Boolean, default: false, index: true },
    newArrival: { type: Boolean, default: false, index: true },
    bestseller: { type: Boolean, default: false, index: true },
  },
  { timestamps: true } // gives createdAt/updatedAt per Section 2.4
);

// Compound indexes for the category/search/listing endpoints (Section 2.17)
productSchema.index({ category: 1, status: 1, createdAt: -1 });
productSchema.index({ status: 1, price: 1 });
productSchema.index({ name: "text", description: "text", tags: "text" }); // Section 2.5 search

productSchema.pre("validate", function setSlug() {
  if (this.name && !this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
});

module.exports = mongoose.model("Product", productSchema);
