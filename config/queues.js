const { Queue } = require("bullmq");
const { getQueueConnection } = require("./queueConnection");

/**
 * Section 2.17 — "Move non-request-critical work off the request/response
 * cycle into a job queue: sending emails, generating PDF invoices,
 * processing uploaded images, syncing inventory, sending abandoned-cart
 * reminders."
 *
 * This stage wires the queue infrastructure and ONE real end-to-end job
 * (order-confirmation email, since Stage 7 already has a concrete trigger
 * for it — a payment webhook confirming an order). The other job types
 * named in the spec are noted as deliberate follow-ups rather than faked:
 * PDF invoice generation needs the pdf tooling wired in; image processing
 * needs the upload feature (not yet built); inventory sync has no external
 * system to sync with yet; abandoned-cart reminders need a scheduled/
 * repeatable job (BullMQ supports this via `queue.add(..., { repeat: {...}
 * })`) and a definition of "abandoned" that's a product decision, not a
 * technical one — better to build it deliberately later than stub
 * something that looks done but isn't.
 */

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 5000 },
  removeOnComplete: { age: 3600 }, // keep completed jobs for 1hr for debugging, then drop
  removeOnFail: { age: 86400 }, // keep failed jobs for 24hr so they're inspectable
};

let emailQueue = null;

function getEmailQueue() {
  if (emailQueue) return emailQueue;
  emailQueue = new Queue("email", { connection: getQueueConnection(), defaultJobOptions });
  return emailQueue;
}

module.exports = { getEmailQueue };
