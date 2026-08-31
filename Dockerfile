# Multi-stage production build for Lenggo on Google Cloud Run
# Stage 1: Build Frontend and Backend Assets
FROM node:20-slim AS builder

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install all dependencies including devDependencies for build phase
RUN npm ci

# Copy source code and config
COPY . .

# Build Vite client SPA and bundle server.ts to dist/server.cjs
RUN npm run build

# Stage 2: Production Minimal Runtime
FROM node:20-slim AS runner

WORKDIR /app

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy compiled outputs from builder
COPY --from=builder /app/dist ./dist

# Create non-root system user for container security hardening
RUN groupadd -r nodejs && useradd -r -g nodejs nodejs
USER nodejs

# Expose standard Cloud Run ingress port
EXPOSE 3000

# Start compiled CommonJS Express server
CMD ["node", "dist/server.cjs"]
