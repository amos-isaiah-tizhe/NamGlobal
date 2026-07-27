# Section 2.17 — containerize so the app deploys identically across environments.
FROM node:20-alpine AS base
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Non-root user — never run the app as root in a container
RUN addgroup -S nodeapp && adduser -S nodeapp -G nodeapp
USER nodeapp

ENV NODE_ENV=production
EXPOSE 3000

# Section 2.17 — cheap liveness check the orchestrator/platform can poll directly
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
