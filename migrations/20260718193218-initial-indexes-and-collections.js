module.exports = {
  async up(db) {
    await db.collection("categories").createIndex({ slug: 1 }, { unique: true });
    await db.collection("categories").createIndex({ name: 1 }, { unique: true });

    await db.collection("brands").createIndex({ slug: 1 }, { unique: true });
    await db.collection("brands").createIndex({ name: 1 }, { unique: true });

    await db.collection("products").createIndex({ slug: 1 }, { unique: true });
    await db.collection("products").createIndex({ sku: 1 }, { unique: true });
    await db.collection("products").createIndex({ category: 1, status: 1, createdAt: -1 });
    await db.collection("products").createIndex({ status: 1, price: 1 });
    await db.collection("products").createIndex(
      { name: "text", description: "text", tags: "text" },
      { name: "product_search_text" }
    );

    await db.collection("users").createIndex({ email: 1 }, { unique: true });
    await db.collection("users").createIndex({ googleId: 1 }, { unique: true, sparse: true });
    await db.collection("users").createIndex({ githubId: 1 }, { unique: true, sparse: true });

    await db.collection("orders").createIndex({ orderNumber: 1 }, { unique: true });
    await db.collection("orders").createIndex({ user: 1, createdAt: -1 });
    await db.collection("orders").createIndex({ status: 1, createdAt: -1 });

    await db.collection("coupons").createIndex({ code: 1 }, { unique: true });

    await db.collection("newsletterSubscribers").createIndex({ email: 1 }, { unique: true });

    await db.collection("auditlogs").createIndex({ actor: 1, createdAt: -1 });
    await db.collection("auditlogs").createIndex({ targetType: 1, targetId: 1 });
  },

  async down(db) {
    await db.collection("categories").dropIndex("slug_1").catch(() => {});
    await db.collection("categories").dropIndex("name_1").catch(() => {});

    await db.collection("brands").dropIndex("slug_1").catch(() => {});
    await db.collection("brands").dropIndex("name_1").catch(() => {});

    await db.collection("products").dropIndex("slug_1").catch(() => {});
    await db.collection("products").dropIndex("sku_1").catch(() => {});
    await db.collection("products").dropIndex("category_1_status_1_createdAt_-1").catch(() => {});
    await db.collection("products").dropIndex("status_1_price_1").catch(() => {});
    await db.collection("products").dropIndex("product_search_text").catch(() => {});

    await db.collection("users").dropIndex("email_1").catch(() => {});
    await db.collection("users").dropIndex("googleId_1").catch(() => {});
    await db.collection("users").dropIndex("githubId_1").catch(() => {});

    await db.collection("orders").dropIndex("orderNumber_1").catch(() => {});
    await db.collection("orders").dropIndex("user_1_createdAt_-1").catch(() => {});
    await db.collection("orders").dropIndex("status_1_createdAt_-1").catch(() => {});

    await db.collection("coupons").dropIndex("code_1").catch(() => {});

    await db.collection("newsletterSubscribers").dropIndex("email_1").catch(() => {});

    await db.collection("auditlogs").dropIndex("actor_1_createdAt_-1").catch(() => {});
    await db.collection("auditlogs").dropIndex("targetType_1_targetId_1").catch(() => {});
  },
};
