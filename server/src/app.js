import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'node:path';
import './db.js';
import { config, isProduction } from './config.js';
import { attachUser } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import entityRoutes from './routes/entities.js';
import uploadRoutes from './routes/uploads.js';
import appRoutes from './routes/app.js';

export const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(compression());
app.use(cors({ origin: isProduction ? true : config.clientUrl, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(config.uploadsDir, { maxAge: '7d' }));

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
