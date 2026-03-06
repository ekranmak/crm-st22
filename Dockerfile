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

# Start preview server on all interfaces
ENV HOST=0.0.0.0
ENV PORT=3000

# Start command
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "3000"]

