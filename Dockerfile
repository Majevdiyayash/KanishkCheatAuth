# Multi-stage build for KANISHK CHEAT AUTH on Railway
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build frontend and server assets
RUN npm run build

# Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy package files and install production deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy build output and server code
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Railway assigns PORT dynamically
EXPOSE 5000

CMD ["npm", "start"]
