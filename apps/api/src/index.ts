import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import 'dotenv/config';

import { integrationsRouter } from './routes/integrations.js';
import { dashboardRouter } from './routes/dashboard.js';
import { eventsRouter } from './routes/events.js';
import { checkRouter } from './routes/check.js';
import { simulatorRouter } from './routes/simulator.js';
import { storexRouter } from './storex/router.js';

const app = express();
const serverStartTime = Date.now();

const explicitOrigins = process.env.WEB_URL
  ? process.env.WEB_URL.split(',').map(origin => origin.trim())
  : [];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (explicitOrigins.includes('*') || explicitOrigins.includes(origin)) {
        return callback(null, true);
      }
      const isLocalOrVercel =
        /^https?:\/\/(localhost|127\.0\.0\.1|172\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/.test(
          origin
        ) ||
        origin.endsWith('.vercel.app') ||
        origin.includes('thirdeye');

      if (isLocalOrVercel) {
        return callback(null, true);
      }
      return callback(new Error(`CORS request from ${origin} blocked by security policy`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '100kb' }));

// Observability: Request tracing and latency profiling
app.use((req, res, next) => {
  const start = process.hrtime();
  const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  res.setHeader('X-Request-Id', requestId);

  const originalEnd = res.end;
  res.end = function (...args: any[]): any {
    const diff = process.hrtime(start);
    const durationMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${durationMs}ms`);
    }
    if (process.env.NODE_ENV !== 'test') {
      console.log(
        `[api] ${res.statusCode} ${req.method} ${req.originalUrl} - ${durationMs}ms (req_${requestId.slice(0, 8)})`
      );
    }
    return originalEnd.apply(this, args as any);
  };

  next();
});

// Health check endpoint
app.get('/healthz', (_req, res) => {
  res.status(200).json({ ok: true, service: 'thirdeye-api' });
});

// Self-documenting API discovery manifest
app.get('/api', (_req, res) => {
  res.status(200).json({
    service: 'ThirdEye Security Engine API',
    version: '1.0.0',
    status: 'operational',
    uptimeSeconds: Math.floor((Date.now() - serverStartTime) / 1000),
    environment: process.env.NODE_ENV || 'production',
    endpoints: {
      health: 'GET /healthz',
      serviceIndex: 'GET /api',
      integrations: 'GET /api/integrations',
      integrationDetail: 'GET /api/integrations/:id',
      checkRequest: 'POST /api/check-request',
      securityEvents: 'GET /api/security-events',
      verifyAuditTrail: 'GET /api/security-events/verify',
      dashboardStats: 'GET /api/dashboard/stats',
      dashboardActivity: 'GET /api/dashboard/activity',
      simulatorStart: 'POST /api/simulator/start',
    },
  });
});

// Route registration
app.use('/api/integrations', integrationsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/security-events', eventsRouter);
app.use('/api/check-request', checkRouter);
app.use('/api/simulator', simulatorRouter);
app.use('/api/storex', storexRouter);

const isTestEnv =
  process.env.NODE_ENV === 'test' ||
  Boolean(process.env.NODE_TEST_CONTEXT) ||
  process.argv.some(arg => arg.includes('test'));

const initialPort = Number(process.env.PORT || 4000);
if (!isTestEnv) {
  const server = app.listen(initialPort, () => {
    console.log(`[thirdeye-api] server running on port ${initialPort}`);
  });
  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[thirdeye-api] Port ${initialPort} in use, trying ${initialPort + 1}...`);
      app.listen(initialPort + 1, () => {
        console.log(`[thirdeye-api] server running on port ${initialPort + 1}`);
      });
    } else {
      console.error(err);
    }
  });
}

export default app;
