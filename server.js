/**
 * Custom Next.js server for Railway deployment
 * 
 * Ensures proper binding to 0.0.0.0 and uses Railway's PORT environment variable
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const isProduction = process.env.NODE_ENV === 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

// Validate port
if (isNaN(port) || port < 1 || port > 65535) {
  console.error(`Invalid PORT: ${process.env.PORT}`);
  process.exit(1);
}

console.log(`Starting server in ${isProduction ? 'production' : 'development'} mode`);
console.log(`Binding to ${hostname}:${port}`);

const app = next({ 
  dev: !isProduction,
  hostname,
  port
});

const handle = app.getRequestHandler();

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Request handling error:', err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end('Internal server error');
      }
    }
  });

  server.listen(port, hostname, () => {
    console.log(`✓ Server ready on http://${hostname}:${port}`);
    console.log(`✓ Environment: ${isProduction ? 'production' : 'development'}`);
  });

  server.on('error', (err) => {
    console.error('Server error:', err);
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use`);
    }
    process.exit(1);
  });
}).catch((err) => {
  console.error('Next.js initialization failed:', err);
  console.error('Error details:', err.stack);
  process.exit(1);
});

