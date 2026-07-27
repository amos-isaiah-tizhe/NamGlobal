const pino = require("pino");
const env = require("./env");

/**
 * Structured logging (Section 2.17) so failures in a multi-instance
 * deployment are traceable back to a single request via the correlation ID
 * middleware/requestLogger.js attaches. Pretty-printed in development only;
 * production/staging emit plain JSON lines, which is what log aggregators
 * (and Sentry, if wired) expect.
 */
const logger = pino({
  level: process.env.LOG_LEVEL || (env.isProduction ? "info" : "debug"),
  transport: env.isDevelopment
    ? { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" } }
    : undefined,
});

module.exports = logger;
