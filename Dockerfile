# Stage 1: Build environment
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install -g react-native-cli
RUN npm install

# Copy all files
COPY . .

# Stage 2: Production image
FROM node:18-alpine

WORKDIR /app

# Copy built dependencies from builder
COPY --from=builder /app .

# Expose Metro port
EXPOSE 8081

# Start Metro server
CMD ["npm", "start"]