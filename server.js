/**
 * Custom Next.js server for Railway deployment
 * 
 * Ensures proper binding to 0.0.0.0 and uses Railway's PORT environment variable
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const isProduction = process.env.NODE_ENV === 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev: !isProduction });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      if (isProduction) {
        res.statusCode = 500;
        res.end('Internal server error');
      } else {
        console.error('Request handling error:', err);
        res.statusCode = 500;
        res.end('Internal server error');
      }
    }
  }).listen(port, hostname, (err) => {
    if (err) {
      console.error('Server startup failed:', err);
      process.exit(1);
    }
    if (!isProduction) {
      console.log(`Server ready on http://${hostname}:${port}`);
    }
  });
}).catch((err) => {
  console.error('Next.js initialization failed:', err);
  process.exit(1);
});

