const { body } = require("express-validator");

const checkoutValidator = [
  body("recipientName").trim().notEmpty().withMessage("Recipient name is required").isLength({ max: 120 }),
  body("phone").trim().notEmpty().withMessage("Phone number is required").isLength({ max: 25 }),
  body("line1").trim().notEmpty().withMessage("Address is required").isLength({ max: 200 }),
  body("line2").optional({ checkFalsy: true }).trim().isLength({ max: 200 }),
  body("city").trim().notEmpty().withMessage("City is required").isLength({ max: 100 }),
  body("state").trim().notEmpty().withMessage("State is required").isLength({ max: 100 }),

  // Guest checkout only needs an email if the shopper isn't logged in;
  // controller checks req.user separately, this just validates format when present.
  body("guestEmail").optional({ checkFalsy: true }).trim().isEmail().withMessage("Enter a valid email address"),
];

module.exports = checkoutValidator;
