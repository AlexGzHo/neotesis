# ==========================================
# Stage 1: Build Frontend (React + Vite)
# ==========================================
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies for build
# libc6-compat needed for some native modules on Alpine
# Install dependencies for build
# libc6-compat needed for some native modules on Alpine
# Install system tools required by ocrmypdf and Tesseract
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    py3-pip \
    tesseract-ocr \
    tesseract-ocr-data-eng \
    tesseract-ocr-data-spa \
    ghostscript \
    unpaper \
    pngquant \
    poppler-utils \
    build-base \
    python3-dev \
    libffi-dev \
    gcc \
    musl-dev \
    linux-headers

# Install ocrmypdf via pip in a virtual environment to avoid conflicts
RUN python3 -m venv /opt/venv && \
    . /opt/venv/bin/activate && \
    pip install --upgrade pip && \
    pip install --no-cache-dir ocrmypdf

# Add venv to PATH so ocrmypdf is globally available
ENV PATH="/opt/venv/bin:$PATH"
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
COPY services ./services
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
