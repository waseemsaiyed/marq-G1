import express from 'express';
import path from 'path';
import fs from 'fs';

function resolvePort(): number {
  // 1. Check command-line arguments (--port 3000 or -p 3000)
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === '--port' || process.argv[i] === '-p') {
      const p = Number(process.argv[i + 1]);
      if (!isNaN(p) && p > 0) return p;
    }
  }

  // 2. If DEFAULT_APP_PORT is set by AI Studio container runtime, use it (3000)
  if (process.env.DEFAULT_APP_PORT) {
    const p = Number(process.env.DEFAULT_APP_PORT);
    if (!isNaN(p) && p > 0) return p;
  }

  // 3. In AI Studio Cloud Run architecture, NGINX listens on PORT 8080 and proxies to 3000.
  // Never bind to 8080 if Nginx or Control Plane is running, otherwise EADDRINUSE will crash the instance.
  if (process.env.NGINX_PORT || process.env.CONTROL_PLANE_PORT) {
    return 3000;
  }

  // 4. Standalone container fallback to PORT environment variable
  const envPort = Number(process.env.PORT);
  if (!isNaN(envPort) && envPort > 0) {
    return envPort;
  }

  return 3000;
}

async function startServer() {
  const app = express();
  const PORT = resolvePort();
  const distPath = path.join(process.cwd(), 'dist');

  // Determine production vs development mode
  const isExplicitDev = process.argv.includes('--dev') || process.env.npm_lifecycle_event === 'dev';
  const isProduction = !isExplicitDev && (
    process.env.NODE_ENV === 'production' ||
    process.env.npm_lifecycle_event === 'start' ||
    fs.existsSync(path.join(distPath, 'index.html'))
  );

  // JSON and URL-encoded parsers for potential API payloads
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check routes for Cloud Run, Kubernetes, and uptime probes
  app.get(['/api/health', '/healthz', '/health'], (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  if (isProduction) {
    console.log(`Starting Express server in PRODUCTION mode serving static files from: ${distPath}`);
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    console.log('Starting Express server in DEVELOPMENT mode with Vite middleware...');
    // Dynamically import Vite only in development so production has zero dev dependencies overhead
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running and listening on http://0.0.0.0:${PORT} [mode: ${isProduction ? 'production' : 'development'}]`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start the Express backend server:', err);
  process.exit(1);
});
