# ============================================
# Stage 1: Install dependencies
# ============================================
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files for dependency installation
COPY package.json package-lock.json ./

# Install ALL dependencies (needed for build + prisma generate)
RUN npm ci

# ============================================
# Stage 2: Build the application
# ============================================
FROM node:20-alpine AS build

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/package-lock.json ./package-lock.json

# Copy source code
COPY . .

# Provide a dummy DATABASE_URL for Prisma generate (only needed for client generation, not connection)
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

# Generate Prisma client
RUN npx prisma generate --schema=db/prisma/schema.prisma

# Build the NestJS application
RUN npm run build

# Install production-only dependencies
RUN npm ci --omit=dev

# Re-generate Prisma client in production node_modules
RUN npx prisma generate --schema=db/prisma/schema.prisma

# ============================================
# Stage 3: Production image
# ============================================
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy production node_modules (includes Prisma client)
COPY --from=build /app/node_modules ./node_modules

# Copy compiled application
COPY --from=build /app/dist ./dist

# Copy Prisma schema (needed for runtime migrations if applicable)
COPY --from=build /app/db/prisma/schema.prisma ./db/prisma/schema.prisma

# Copy package.json for metadata
COPY --from=build /app/package.json ./package.json

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/src/main.js"]
