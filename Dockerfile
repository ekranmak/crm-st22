FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --production=false

# Copy source
COPY . .

# Create .env file from build arguments (Vite needs these at build time)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID
RUN echo "VITE_SUPABASE_URL=${VITE_SUPABASE_URL}" > .env && \
    echo "VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY}" >> .env && \
    echo "VITE_SUPABASE_PROJECT_ID=${VITE_SUPABASE_PROJECT_ID}" >> .env

# Build the project
RUN npm run build

# Verify dist was created
RUN if [ ! -d "dist" ]; then echo "ERROR: dist folder not created!" && exit 1; fi
RUN ls -la dist/

# Make start script executable
RUN chmod +x start.sh 2>/dev/null || true

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start with detailed logging
CMD ["node", "server.js"]

