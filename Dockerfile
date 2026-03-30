# Stage 1: Build frontend
FROM 86m1pxwp2lsm02mxpy.xuanyuan.run/library/node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production — single Node.js process serves frontend + API
FROM 86m1pxwp2lsm02mxpy.xuanyuan.run/library/node:20-alpine
WORKDIR /app
COPY sync-server/ ./sync-server/
COPY --from=builder /app/dist ./dist

# Create persistent directories
RUN mkdir -p sync-server/docs sync-server/sessions sync-server/data sync-server/config

EXPOSE 3000
ENV PORT=3000
CMD ["node", "sync-server/server.cjs"]
