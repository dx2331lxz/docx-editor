# Stage 1: Build frontend
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Run backend
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY server/ ./server/
COPY --from=builder /app/dist ./dist
RUN mkdir -p server/data/docs

EXPOSE 3011
CMD ["node", "server/index.cjs"]
