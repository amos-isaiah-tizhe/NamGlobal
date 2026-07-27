/**
 * worker.js
 *
 * Separate process from server.js — Section 2.17: "At free-tier request
 * volume, a single worker is sufficient; document the upgrade path to
 * multiple workers." Run via `node worker.js` locally, or as its own PM2
 * app entry in production (ecosystem.config.js).
 */

const { Worker } = require("bullmq");
const { getQueueConnection } = require("./config/queueConnection");
const { connectDB } = require("./config/database");
const logger = require("./config/logger");
const { sendOrderConfirmationEmail } = require("./services/emailService");

async function start() {
  await connectDB(); // some job payloads may need to re-fetch related data

  const emailWorker = new Worker(
    "email",
    async (job) => {
      logger.info({ jobId: job.id, name: job.name }, "Processing job");

      if (job.name === "order-confirmation") {
        const { to, orderNumber, total, items } = job.data;
        if (!to) {
          logger.warn({ orderNumber }, "No recipient email on order — skipping (guest checkout with no email captured?)");
          return { skipped: true };
        }
        return sendOrderConfirmationEmail({ to, orderNumber, total, items });
      }

      logger.warn({ name: job.name }, "Unknown job name in email queue — skipping");
      return { skipped: true };
    },
    { connection: getQueueConnection(), concurrency: 5 }
  );

  emailWorker.on("completed", (job) => logger.info({ jobId: job.id }, "Job completed"));
  emailWorker.on("failed", (job, err) => logger.error({ jobId: job?.id, err: err.message }, "Job failed"));

  logger.info("Worker started, listening on the 'email' queue");

  // Graceful shutdown — same discipline as the web process (Section 2.17)
  process.on("SIGTERM", async () => {
    logger.info("Worker received SIGTERM, closing...");
    await emailWorker.close();
    process.exit(0);
  });
}

start().catch((err) => {
  console.error("Worker failed to start:", err);
  process.exit(1);
});
