# backend/Dockerfile
FROM node:20

# Set the working directory
# In backend/Dockerfile
WORKDIR /app
# Set the working directory in the container
WORKDIR /app 

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install dependencies
# Use --production if you dont need devDependencies
RUN npm install --production 
# If you need devDependencies (e.g., for a build step within Docker), just use `RUN npm install`

# Copy the rest of your applications source code'
COPY . .
# Expose the port your application runs on
EXPOSE 5000

# Command to run your application (e.g., node server.js or npm start)
CMD [ "node", "server.js" ]