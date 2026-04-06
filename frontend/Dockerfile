# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependencies first for better caching
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build with standalone mode - bundles everything needed
RUN npm run build

# Production stage - uses pre-bundled standalone output
FROM node:18-alpine

WORKDIR /app

# Copy only the minimal standalone build (already includes bundled dependencies)
COPY --from=builder /app/.next/standalone .
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

# Run the pre-built server directly
CMD ["node", "server.js"]
