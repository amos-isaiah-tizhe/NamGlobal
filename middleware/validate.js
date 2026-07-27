const { validationResult } = require("express-validator");

/**
 * Wraps an array of express-validator checks. Usage:
 *   router.post("/contact", validate(contactValidator), contactController.submit)
 *
 * On failure, responds 400 with field-level messages instead of letting the
 * handler run — covers the "rejection cases (missing fields, wrong types,
 * oversized payloads)" testing requirement from Section 2.19.
 */
function validate(checks) {
  return async (req, res, next) => {
    await Promise.all(checks.map((check) => check.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) return next();

    return res.status(400).json({
      error: "Validation failed",
      details: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  };
}

module.exports = validate;
