const productService = require("../services/productService");
const categoryService = require("../services/categoryService");
const { faqSchema } = require("../utils/structuredData");

// Static content for sections that don't have their own model yet
// (Section 2.3 lists these but Stage 5 keeps them config-driven rather than
// inventing a Testimonial/BlogPost model before there's a real need for
// admin-editable versions of them).
const WHY_CHOOSE_US = [
  "Quality phones and gadgets",
  "Transparent buying and selling process",
  "Competitive prices and genuine deals",
  "Phone and gadget swapping available",
  "Professional customer support",
  "Product inspection before purchase",
  "Nationwide delivery options",
  "Wide range of phones and accessories",
];

const FAQS = [
  {
    question: "Does Nam Global buy, sell, and swap phones?",
    answer:
      "Yes — Nam Global offers all three: iSELL (we sell to you), iBUY (we buy your device), and iSWAP (device trade-in/exchange).",
  },
  {
    question: "What is Nam Global's return policy?",
    answer:
      "Returns or exchanges can be requested within 7 days of delivery for eligible products, provided the item is in its original condition with proof of purchase.",
  },
  {
    question: "Does Nam Global deliver outside Keffi?",
    answer:
      "Yes — Nam Global delivers nationwide across Nigeria, with coverage including Abuja, Lagos, Kano, Port Harcourt, and more.",
  },
];

exports.showHome = async (req, res, next) => {
  try {
    const [featured, newArrivals, flashSale, trending, bestsellers, latest, categories] = await Promise.all([
      productService.getFeatured(8),
      productService.getNewArrivals(8),
      productService.getFlashSale(8),
      productService.getTrending(8),
      productService.getBestsellers(8),
      productService.getLatest(8),
      categoryService.listActive(),
    ]);

    res.render("home", {
      title: undefined,
      metaDescription:
        "Nam Global — buy, sell, and swap quality smartphones, laptops, gaming consoles, and gadgets in Keffi, Nasarawa, with nationwide delivery across Nigeria.",
      structuredData: [faqSchema(FAQS)],
      featured,
      newArrivals,
      flashSale,
      trending,
      bestsellers,
      latest,
      categories,
      whyChooseUs: WHY_CHOOSE_US,
      faqs: FAQS,
    });
  } catch (err) {
    next(err);
  }
};
