import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Get PORT from environment or use default
const port = parseInt(process.env.PORT || '3000', 10);
const host = process.env.HOST || '0.0.0.0';

console.log('═══════════════════════════════════════════════════════════');
console.log('🚀 CRM Application Starting');
console.log('═══════════════════════════════════════════════════════════');
console.log(`⏰ Time: ${new Date().toISOString()}`);
console.log(`📁 Working directory: ${process.cwd()}`);
console.log(`🔧 Node version: ${process.version}`);
console.log(`🌐 Server will listen on: ${host}:${port}`);
console.log(`📝 Environment: NODE_ENV=${process.env.NODE_ENV || 'development'}`);
console.log('═══════════════════════════════════════════════════════════');

// Check if dist folder exists
const distPath = join(__dirname, 'dist');
console.log(`\n📂 Checking dist folder at: ${distPath}`);

if (!fs.existsSync(distPath)) {
  console.error(`❌ ERROR: dist folder not found!`);
  console.error(`Expected path: ${distPath}`);
  console.error('Available directories:');
  fs.readdirSync(__dirname).forEach(file => {
    const fullPath = join(__dirname, file);
    const isDir = fs.statSync(fullPath).isDirectory();
    console.error(`  ${isDir ? '📁' : '📄'} ${file}`);
  });
  process.exit(1);
}

console.log(`✅ dist folder found!`);
console.log('Files in dist:');
fs.readdirSync(distPath).forEach(file => {
  const fullPath = join(distPath, file);
  const stats = fs.statSync(fullPath);
  const isDir = stats.isDirectory();
  console.log(`  ${isDir ? '📁' : '📄'} ${file} (${stats.size} bytes)`);
});

console.log(`\n🔌 Setting up Express middleware...`);

// Serve static files from dist directory
app.use(express.static(distPath, {
  maxAge: process.env.NODE_ENV === 'production' ? '1h' : '0',
  etag: false,
  setHeaders: (res, path) => {
    // Cache static assets
    if (path.endsWith('.html')) {
      res.set('Cache-Control', 'public, max-age=0');
    } else if (path.match(/\.(js|css|woff|woff2|ttf|eot)$/)) {
      res.set('Cache-Control', 'public, max-age=31536000');
    }
  }
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API info endpoint  
app.get('/api/info', (req, res) => {
  res.status(200).json({
    app: 'CRM Application',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    port: port,
    node: process.version,
    environment: process.env.NODE_ENV
  });
});

// Handle SPA routing - all other routes go to index.html
app.get('*', (req, res) => {
  const indexPath = join(distPath, 'index.html');
  
  if (!fs.existsSync(indexPath)) {
    console.error(`❌ index.html not found at ${indexPath}`);
    return res.status(404).send('index.html not found');
  }
  
  console.log(`📄 Serving index.html for route: ${req.path}`);
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(indexPath);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error occurred:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Start server
const server = app.listen(port, host, () => {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`✅ Server started successfully!`);
  console.log(`🌐 Access the application at: http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`);
  console.log(`   Health check: http://${host === '0.0.0.0' ? 'localhost' : host}:${port}/health`);
  console.log('═══════════════════════════════════════════════════════════\n');
});

// Handle shutdown gracefully
process.on('SIGTERM', () => {
  console.log('\n📋 SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n📋 SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});


