#!/bin/bash

# Make the script exit on any error
set -e

echo "========== REACT NATIVE ENVIRONMENT FIX SCRIPT =========="
echo "This script will fix common React Native Docker environment issues"

# 1. Update package.json to include required dependencies
echo "1. Updating package.json with required dependencies..."

# Back up original package.json
cp package.json package.json.bak
echo "✅ Original package.json backed up to package.json.bak"

# Check if @react-native-community/cli is already in package.json
if ! grep -q '"@react-native-community/cli"' package.json; then
    # Use temp file approach for more reliable JSON editing
    node -e "
        const fs = require('fs');
        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        
        // Ensure scripts use npx
        pkg.scripts = pkg.scripts || {};
        pkg.scripts.start = 'npx react-native start';
        pkg.scripts.android = 'npx react-native run-android';
        pkg.scripts.ios = 'npx react-native run-ios';
        
        // Ensure we have the right dependencies
        pkg.devDependencies = pkg.devDependencies || {};
        pkg.devDependencies['@react-native-community/cli'] = '^12.0.0';
        pkg.devDependencies['@react-native-community/cli-platform-android'] = '^12.0.0';
        pkg.devDependencies['@react-native-community/cli-platform-ios'] = '^12.0.0';
        
        // Write back the updated package.json
        fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
    "
    echo "✅ Added React Native CLI dependencies to package.json"
else
    echo "✅ React Native CLI dependencies already in package.json"
fi

# 2. Update Dockerfile.dev for the frontend
echo "2. Creating optimized Dockerfile.dev for React Native..."

cat > Dockerfile.dev << 'EOF'
# Use Node.js with proper system dependencies for React Native
FROM node:20

# Install system dependencies needed for React Native
RUN apt-get update && apt-get install -y \
    git \
    curl \
    wget \
    unzip \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Install global CLI tools AFTER npm install to ensure paths are correct
RUN npm install -g react-native-cli

# Copy the rest of the application code
COPY . .

# Expose ports needed for React Native
EXPOSE 8081 19000 19001 19002 8097

# Set environment variables
ENV NODE_ENV=development
ENV REACT_NATIVE_PACKAGER_HOSTNAME=0.0.0.0

# Start the Metro bundler with explicit host binding
CMD ["npx", "react-native", "start", "--host", "0.0.0.0"]
EOF

echo "✅ Created optimized Dockerfile.dev"

# 3. Update docker-compose.yml
echo "3. Updating docker-compose.yml..."

# Check if docker-compose.yml exists
if [ -f "docker-compose.yml" ]; then
    # Preserve the original docker-compose.yml
    cp docker-compose.yml docker-compose.yml.bak
    echo "✅ Original docker-compose.yml backed up to docker-compose.yml.bak"
    
    # Check if frontend-dev service exists in docker-compose.yml
    if grep -q "frontend-dev:" docker-compose.yml; then
        echo "✅ frontend-dev service found in docker-compose.yml"
    else
        echo "⚠️ frontend-dev service not found in docker-compose.yml"
        echo "Please add the frontend-dev service manually to your docker-compose.yml"
        cat >> docker-compose.yml << 'EOF'

  # Frontend Development
  frontend-dev:
    build:
      context: .
      dockerfile: Dockerfile.dev
    container_name: cloud-explorer-frontend-dev
    env_file: .env
    volumes:
      - .:/app
      - /app/node_modules
    ports:
      - "8081:8081"
      - "19000:19000"
      - "19001:19001"
      - "19002:19002"
      - "8097:8097"
    environment:
      - NODE_ENV=development
      - REACT_NATIVE_PACKAGER_HOSTNAME=0.0.0.0
    command: npx react-native start --host 0.0.0.0
EOF
        echo "✅ Added frontend-dev service to docker-compose.yml"
    fi
else
    echo "⚠️ docker-compose.yml not found. Creating minimal version..."
    
    cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  # Frontend Development
  frontend-dev:
    build:
      context: .
      dockerfile: Dockerfile.dev
    container_name: cloud-explorer-frontend-dev
    volumes:
      - .:/app
      - /app/node_modules
    ports:
      - "8081:8081"
      - "19000:19000"
      - "19001:19001"
      - "19002:19002"
      - "8097:8097"
    environment:
      - NODE_ENV=development
      - REACT_NATIVE_PACKAGER_HOSTNAME=0.0.0.0
    command: npx react-native start --host 0.0.0.0

  # Backend Service
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: cloud-explorer-backend
    ports:
      - "5000:5000"
    volumes:
      - ./backend:/backend
EOF
    
    echo "✅ Created minimal docker-compose.yml"
fi

# 4. Run npm install to ensure dependencies are properly installed
echo "4. Installing dependencies locally..."
npm install

echo "✅ Dependencies installed locally"

# 5. Rebuild and restart containers
echo "5. Rebuilding Docker containers..."

# Stop any running containers
docker-compose down

# Build the containers with no cache to ensure clean rebuild
docker-compose build --no-cache frontend-dev

echo "✅ Docker containers rebuilt"

echo ""
echo "========== ENVIRONMENT FIX COMPLETE =========="
echo ""
echo "To start the React Native development environment, run:"
echo "  docker-compose up frontend-dev"
echo ""
echo "Metro bundler should be accessible at: http://localhost:8081"
echo "Expo DevTools should be accessible at: http://localhost:19002"
echo ""
echo "If you're still experiencing issues, try these steps:"
echo "1. Inside the container: npx react-native doctor"
echo "2. Make sure your .env file has appropriate variables"
echo "3. Check container logs: docker-compose logs -f frontend-dev"

