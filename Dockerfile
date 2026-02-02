# ==========================================
# Stage 1: Build Frontend (React + Vite)
# ==========================================
FROM node:22-slim AS builder

WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install all dependencies (frontend needs devDeps for build)
RUN npm ci

# Copy source code
COPY . .

# Build frontend (generates /app/dist)
ENV NODE_ENV=production
RUN npm run build

# ==========================================
# Stage 2: Production Runtime (OCR + Node)
# ==========================================
# Use official OCRmyPDF image as base (Ubuntu-based)
FROM jbarlow83/ocrmypdf

# Set user root for installation
USER root

# Install Node.js 22 LTS and system utilities
RUN apt-get update && apt-get install -y \
    curl \
    tesseract-ocr-spa \
    poppler-utils \
    ghostscript \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

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

# Create necessary directories with correct permissions
RUN mkdir -p logs uploads/temp && \
    chmod -R 777 logs uploads

# Expose port
EXPOSE 8080

# Override entrypoint (ocrmypdf image has a default one)
ENTRYPOINT ["/usr/bin/env"]

# Start server
CMD ["node", "server.js"]
