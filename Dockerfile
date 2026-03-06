FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build the project
RUN npm run build

# Expose port (Railway will assign PORT env var)
EXPOSE 3000

# Start command - use Node.js server
CMD ["npm", "start"]

