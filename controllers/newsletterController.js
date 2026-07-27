const NewsletterSubscriber = require("../models/NewsletterSubscriber");
const { stripHtml } = require("../utils/sanitizeHtml");

exports.subscribe = async (req, res, next) => {
  try {
    const email = stripHtml((req.body.email || "").toLowerCase().trim());

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Enter a valid email address" });
    }

    await NewsletterSubscriber.findOneAndUpdate(
      { email },
      { email, isActive: true },
      { upsert: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
};
