module.exports = {
  apps: [
    {
      name: "nam-global",
      script: "./server.js",
      exec_mode: "cluster",
      instances: "max",
      env_production: {
        NODE_ENV: "production",
      },
      env_staging: {
        NODE_ENV: "staging",
      },
      env_development: {
        NODE_ENV: "development",
      },
      out_file: "./logs/out.log",
      error_file: "./logs/error.log",
      merge_logs: true,
      kill_timeout: 10000, // matches server.js's own 10s graceful-shutdown timeout (Section 2.17)
    },
    {
      // Section 2.17 — "At free-tier request volume, a single worker is
      // sufficient; document the upgrade path to multiple workers." That
      // upgrade path is simply raising `instances` here — the worker itself
      // (worker.js) is already stateless and horizontally scalable.
      name: "nam-global-worker",
      script: "./worker.js",
      exec_mode: "fork", // BullMQ workers manage their own concurrency internally; no need for cluster mode
      instances: 1,
      env_production: { NODE_ENV: "production" },
      env_staging: { NODE_ENV: "staging" },
      env_development: { NODE_ENV: "development" },
      out_file: "./logs/worker-out.log",
      error_file: "./logs/worker-error.log",
      merge_logs: true,
      kill_timeout: 10000,
    },
    // Section 2.7/2.22 — cloudflared runs as its own PM2-managed process so
    // the tunnel gets the same auto-restart-on-crash and reboot-persistence
    // behavior as the application. Requires `cloudflared tunnel login` and
    // a configured tunnel first (Stage 11 — Free-Tier Deployment). Uncomment
    // once that's set up:
    //
    // {
    //   name: "cloudflared",
    //   script: "cloudflared",
    //   args: "tunnel run nam-global",
    //   exec_mode: "fork",
    //   instances: 1,
    //   out_file: "./logs/cloudflared-out.log",
    //   error_file: "./logs/cloudflared-error.log",
    // },
  ],
};
