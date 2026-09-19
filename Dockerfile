# Multi-stage Dockerfile for AI Study Companion

# Stage 1: Build Vite Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
# Pass VITE_API_URL if specified at build time, else empty so it falls back to /api
ARG VITE_API_URL=""
ARG VITE_BACKEND_URL=""
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL

RUN npm run build

# Stage 2: Production Server Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install production dependencies for server
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy backend source
COPY server/ ./server
# Copy OCR language model if present
COPY eng.traineddata* ./

# Copy compiled frontend from builder stage
COPY --from=frontend-builder /app/client/dist ./client/dist

# Create uploads storage folder
RUN mkdir -p uploads && chown -R node:node /app

USER node

EXPOSE 5000

CMD ["npm", "start"]

