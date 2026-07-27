/**
 * config/siteConfig.js
 *
 * Single source of truth for brand-facing content (Section 1) and asset
 * paths (Section 2.15). Never hardcode brand name, contact info, address,
 * or developer attribution directly in a view/controller — read it from
 * here. Attached to res.locals as `site` in server.js so every EJS view
 * can reference `site.name`, `site.assets.logo`, etc. without an explicit
 * pass-through from each controller.
 *
 * Swapping brands (per the template's reuse instructions) should only ever
 * require editing environment variables — never this file's structure.
 */

require("./env");

const siteConfig = {
  name: process.env.SITE_NAME,
  tagline: process.env.SITE_TAGLINE,
  url: process.env.SITE_URL,

  servicePillars: ["iSELL", "iBUY", "iSWAP"], // Section 1.1 — recurring badge motif

  contact: {
    phone: process.env.CONTACT_PHONE,
    whatsapp: process.env.WHATSAPP_NUMBER,
    supportPhone: process.env.SUPPORT_PHONE,
    altPhone: process.env.ALT_PHONE,
    email: process.env.CONTACT_EMAIL,
    supportEmail: process.env.SUPPORT_EMAIL,
    salesEmail: process.env.SALES_EMAIL,
    ordersEmail: process.env.ORDERS_EMAIL,
    returnsEmail: process.env.RETURNS_EMAIL,
  },

  address: {
    line1: process.env.ADDRESS_LINE_1,
    line2: process.env.ADDRESS_LINE_2,
    city: process.env.CITY,
    state: process.env.STATE,
    country: process.env.COUNTRY,
    postalCode: process.env.POSTAL_CODE,
  },

  developer: {
    name: process.env.DEVELOPER_NAME,
    brand: process.env.DEVELOPER_BRAND,
    url: process.env.DEVELOPER_URL,
    brandUrl: process.env.BRAND_URL,
  },

  // Section 1.4 — fixed per the brand brief rather than env-driven, same
  // pattern as servicePillars/colors below (structural brand data, not a
  // per-deployment secret). Found missing from siteConfig entirely during
  // the Stage 14 Section-1 walkthrough — added here and surfaced on the
  // contact page and footer.
  businessHours: [
    { days: "Monday - Friday", hours: "8:00 AM - 6:00 PM" },
    { days: "Saturday", hours: "9:00 AM - 6:00 PM" },
    { days: "Sunday", hours: "12:00 PM - 5:00 PM" },
    { days: "Public Holidays", hours: "10:00 AM - 4:00 PM" },
  ],

  // Section 1.6 — same handle across platforms per the brand brief. Also
  // found missing (only referenced inside JSON-LD's `sameAs`, never shown
  // to a human visitor) during the Stage 14 walkthrough.
  socialMedia: [
    { platform: "Facebook", handle: "@namglobal", url: "https://facebook.com/namglobal" },
    { platform: "Instagram", handle: "@namglobal", url: "https://instagram.com/namglobal" },
    { platform: "X (Twitter)", handle: "@namglobal", url: "https://twitter.com/namglobal" },
    { platform: "TikTok", handle: "@namglobal", url: "https://tiktok.com/@namglobal" },
    { platform: "YouTube", handle: "@namglobal", url: "https://youtube.com/@namglobal" },
    { platform: "LinkedIn", handle: "@namglobal", url: "https://linkedin.com/company/namglobal" },
  ],

  // Section 1.5 — delivery coverage list, shown on the contact page.
  deliveryCoverage: ["Keffi", "Abuja", "Nasarawa State", "Lafia", "Jos", "Kaduna", "Kano", "Lagos", "Port Harcourt", "Enugu", "Nationwide Nigeria"],

  // Section 2.15 — never hardcode these paths directly in templates
  assets: {
    favicon: "/images/branding/favicon.svg",
    logo: "/images/branding/logo.svg",
    hero: "/images/branding/hero.svg",
    heroBackground: "/images/branding/hero-background.svg",
  },

  // Section 2.13 — exposed so views/inline styles can reference brand colors
  // without re-deriving them; the canonical definitions live in
  // public/css/tokens.css as CSS custom properties.
  colors: {
    primary: "#F7941D",
    primaryHover: "#E07C0A",
    accent: "#ED1C24",
    dark: "#111111",
    neutral: "#6b7280",
  },

  currentYear: new Date().getFullYear(),
};

module.exports = siteConfig;
