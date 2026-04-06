# STAGE 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace config
COPY package*.json ./
COPY turbo.json ./

# Copy service specific files
COPY services/auth-service/package*.json ./services/auth-service/
COPY services/auth-service/prisma ./services/auth-service/prisma/

# Install dependencies (using npm workspaces)
RUN npm install

# Copy source
COPY services/auth-service ./services/auth-service

# Generate Prisma Client
WORKDIR /app/services/auth-service
RUN npx prisma generate

# Build the application
RUN npm run build

# STAGE 2: Production
FROM node:20-alpine

WORKDIR /app

# Copy production dependencies and built assets
COPY --from=builder /app/services/auth-service/package*.json ./
COPY --from=builder /app/services/auth-service/dist ./dist
COPY --from=builder /app/services/auth-service/node_modules ./node_modules
COPY --from=builder /app/services/auth-service/src/generated ./src/generated

# Set environment to production
ENV NODE_ENV=production

# Security: Run as non-root user
USER node

EXPOSE 3000

CMD ["node", "dist/main"]
