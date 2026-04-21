# Build stage
FROM node:20-alpine AS builder

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies (including devDependencies needed for build)
RUN npm ci --ignore-scripts

# Copy the rest of the application code
COPY . .

# Build the TypeScript code
RUN npm run build

# Production stage
FROM node:20-alpine

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev --ignore-scripts

# Copy the built artifacts from the builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Expose the API port (defaults to 5000 in env.template)
EXPOSE 5000

# Start the application
CMD ["npm", "start"]
