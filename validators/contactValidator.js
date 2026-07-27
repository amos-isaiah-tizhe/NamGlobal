const { body } = require("express-validator");

const contactValidator = [
  body("fullName")
    .trim()
    .notEmpty()
    .withMessage("Full name is required")
    .isLength({ max: 120 })
    .withMessage("Full name is too long"),

  body("email").trim().notEmpty().withMessage("Email is required").isEmail().withMessage("Enter a valid email address"),

  body("phone")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 25 })
    .withMessage("Phone number is too long"),

  body("subject").trim().notEmpty().withMessage("Subject is required").isLength({ max: 150 }),

  body("message")
    .trim()
    .notEmpty()
    .withMessage("Message is required")
    .isLength({ max: 3000 })
    .withMessage("Message is too long (max 3000 characters)"),
];

module.exports = contactValidator;
