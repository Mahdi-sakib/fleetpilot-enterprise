import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'node:path';
import { initDb } from './db.js';
import { config, isProduction } from './config.js';
import { attachUser } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import entityRoutes from './routes/entities.js';
import uploadRoutes from './routes/uploads.js';
import appRoutes from './routes/app.js';

// No top-level await here: some hosts (e.g. cPanel's Node.js Selector, via
// LiteSpeed's lsnode.js) load the entry file with require(), and Node refuses
// to require() an ESM graph that contains a top-level await
// (ERR_REQUIRE_ASYNC_MODULE). Instead, kick off init immediately and gate
// requests on it — any consumer of `app` (index.js, tests) is still
// guaranteed the schema exists before a request is handled.
export const ready = initDb();

export const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(compression());
// CLIENT_URL is the one trusted frontend origin — set it to wherever the
// frontend is actually hosted (it can differ from the API's own host, e.g.
// a static frontend on one domain calling this API on another).
app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(config.uploadsDir, { maxAge: '7d' }));

app.use((req, res, next) => { ready.then(() => next(), next); });

app.use(attachUser);

app.use('/api/auth', authRoutes);
app.use('/api/entities', entityRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/app', appRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

if (isProduction) {
  const distDir = path.join(config.rootDir, 'dist');
  app.use(express.static(distDir, { maxAge: '1h' }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use(errorHandler);
