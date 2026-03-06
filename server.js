import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Get PORT from environment or use default
const port = process.env.PORT || 3000;
const host = process.env.HOST || '0.0.0.0';

// Check if dist folder exists
const distPath = join(__dirname, 'dist');
if (!fs.existsSync(distPath)) {
  console.error(`ERROR: dist folder not found at ${distPath}`);
  console.error('Please build the project first: npm run build');
  process.exit(1);
}

console.log(`📁 Serving static files from: ${distPath}`);

// Serve static files from dist directory
app.use(express.static(distPath, {
  maxAge: '1h',
  etag: false
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Handle SPA routing - all routes go to index.html
app.get('*', (req, res) => {
  const indexPath = join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('index.html not found');
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).send('Internal Server Error');
});

// Start server
app.listen(port, host, () => {
  console.log(`✅ Server started successfully!`);
  console.log(`🌐 Server running on http://${host}:${port}`);
  console.log(`📍 Environment: NODE_ENV=${process.env.NODE_ENV || 'production'}`);
  console.log(`🔧 PORT=${port}, HOST=${host}`);
});

// Handle shutdown gracefully
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

