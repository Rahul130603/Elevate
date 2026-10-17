# Build both the Vite client and the integrated Next.js news app.
FROM node:22-bookworm-slim AS build

WORKDIR /app

# Native SQLite modules use node-gyp only when a matching prebuilt binary is
# unavailable, so keep the standard build toolchain in this disposable stage.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY news-site/package.json news-site/package-lock.json ./news-site/
RUN npm --prefix news-site ci --ignore-scripts

COPY . .

ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build \
  && npm prune --omit=dev \
  && npm --prefix news-site prune --omit=dev

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PORT=5000 \
    INDUSTRY_NEWS_PORT=3101 \
    NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server ./server
COPY --from=build /app/src/config/industries.json ./src/config/industries.json
COPY --from=build /app/dist ./dist
COPY --from=build /app/news-site ./news-site

RUN mkdir -p /app/data /app/news-site/.next/cache \
  && chown -R node:node /app/data /app/news-site/.next
USER node

EXPOSE 3000 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server/index.js"]
