# syntax=docker/dockerfile:1

# ---- deps: install against the committed lockfile -------------------------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build: compile the standalone Next.js server --------------------------
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Next build doesn't require a reachable database (SPEC.md §12: no secret is
# baked into the image) — every page in this app is session-gated and
# dynamic, so build-time page-data collection never queries it.
RUN mkdir -p public && npm run build

# ---- runtime: the slim, non-root image that actually ships ----------------
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
