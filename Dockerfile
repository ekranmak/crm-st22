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

# Verify dist was created
RUN ls -la dist || (echo "ERROR: dist folder not created after build" && exit 1)

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Start with detailed logging
CMD ["node", "server.js"]

