# Multi-stage Dockerfile optimized for Google Cloud Run (Free Tier) and container hosting
FROM node:20-slim AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies required for building client and server
RUN npm install

# Copy source files
COPY . .

# Compile Vite client and bundle server.ts into dist/server.cjs
RUN npm run build

# Production Runtime
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy compiled frontend and bundled server from builder
COPY --from=builder /app/dist ./dist

# Cloud Run defaults to PORT 8080
EXPOSE 8080

CMD ["node", "dist/server.cjs"]
