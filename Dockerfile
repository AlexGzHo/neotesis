# ==========================================
# Stage 1: Build Frontend (React + Vite)
# ==========================================
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies for build
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build frontend (generates /app/dist)
ENV NODE_ENV=production
RUN npm run build

# ==========================================
# Stage 2: Production Runtime (Node.js)
# ==========================================
FROM node:18-alpine

WORKDIR /app

# Install ONLY production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy backend source code
COPY server.js ./
COPY config ./config
COPY middleware ./middleware
COPY routes ./routes
COPY utils ./utils
COPY models ./models
COPY migrations ./migrations

# Copy built frontend from Stage 1
COPY --from=builder /app/dist ./dist

# Create logs directory
RUN mkdir -p logs

# Environment setup
ENV NODE_ENV=production
ENV PORT=8080

# Expose port
EXPOSE 8080

# Start server
CMD ["node", "server.js"]
