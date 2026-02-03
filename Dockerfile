# ==========================================
# Stage 1: Build Frontend (React + Vite)
# ==========================================
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Build frontend
ENV NODE_ENV=production
RUN npm run build

# ==========================================
# Stage 2: Production Runtime
# ==========================================
FROM node:22-bookworm-slim

# Set working directory
WORKDIR /app

# Set node env
ENV NODE_ENV=production
ENV PORT=8080

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy backend source code
COPY server.js ./
COPY config ./config
COPY middleware ./middleware
COPY routes ./routes
COPY utils ./utils
COPY services ./services
COPY models ./models
COPY migrations ./migrations

# Copy built frontend from Stage 1
COPY --from=builder /app/dist ./dist

# Create necessary directories
RUN mkdir -p logs uploads/temp && \
    chmod -R 777 logs uploads

# Expose port
EXPOSE 8080

# Start server
CMD ["node", "server.js"]
