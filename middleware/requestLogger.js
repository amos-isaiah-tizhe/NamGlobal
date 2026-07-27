const pinoHttp = require("pino-http");
const crypto = require("crypto");
const logger = require("../config/logger");

/**
 * Attaches req.log (a child logger carrying a request ID) and logs every
 * request/response. The same ID is echoed back as X-Request-Id so it can be
 * correlated with client-side error reports or support tickets.
 */
const requestLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const existing = req.headers["x-request-id"];
    const id = existing || crypto.randomUUID();
    res.setHeader("X-Request-Id", id);
    return id;
  },
  autoLogging: {
    ignore: (req) => req.url === "/health" || req.url === "/ready", // don't spam logs with uptime-monitor pings
  },
  customLogLevel: (req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
});

module.exports = requestLogger;
