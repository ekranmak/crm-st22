# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Accept build arguments for Supabase configuration
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID

# Create .env file for build (Vite needs this at build time)
# Use defaults if not provided (will fail fast with clear error)
RUN if [ -z "$VITE_SUPABASE_URL" ]; then \
      echo "ERROR: VITE_SUPABASE_URL build argument not provided!" && exit 1; \
    fi && \
    echo "VITE_SUPABASE_URL=$VITE_SUPABASE_URL" > .env && \
    echo "VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY" >> .env && \
    echo "VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID" >> .env

# Build the project
RUN npm run build

# Verify dist was created
RUN if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then \
      echo "ERROR: dist folder or index.html not created!" && \
      ls -la && exit 1; \
    fi && echo "✅ Build successful! dist/ created with index.html"

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy only needed files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json

# Install only production dependencies
RUN npm ci --production

# Expose port
EXPOSE 3000

# Set environment variables for runtime
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

# Start application
CMD ["node", "server.js"]

