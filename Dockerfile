# Stage 1: Build the frontend and bundle the server
FROM node:20-slim AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build Vite client assets and compile server.ts to dist/server.cjs
RUN npm run build

# Stage 2: Production runtime image
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy compiled build output from the builder stage
COPY --from=builder /app/dist ./dist

# Port configured for Google Cloud Run
ENV PORT=8080
EXPOSE 8080

# Production startup command
CMD ["npm", "start"]
