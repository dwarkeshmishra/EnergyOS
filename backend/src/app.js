require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const http = require('http');

const config = require('./config');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const WebSocketServer = require('./services/websocket');
const IoTSimulator = require('./services/iotSimulator');

// ── Express App ──
const app = express();
const server = http.createServer(app);

// ── Security & Parsing Middleware ──
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://frontend:3000',
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// ── Health Check ──
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', uptime: process.uptime() });
});
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Energy PaaS API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ── API Routes ──
app.use('/api/auth', require('./routes/auth'));
app.use('/api/organizations', require('./routes/organizations'));
app.use('/api/meters', require('./routes/meters'));
app.use('/api/appliances', require('./routes/appliances'));
app.use('/api/energy', require('./routes/energy'));
app.use('/api/tariffs', require('./routes/tariffs'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/users', require('./routes/users'));
app.use('/api/recommendations', require('./routes/recommendations'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/optimization', require('./routes/optimization'));

// ── Error Handling ──
app.use(notFound);
app.use(errorHandler);

// ── WebSocket Server ──
const wsServer = new WebSocketServer();
wsServer.initialize(server);

// ── IoT Simulator ──
const iotSimulator = new IoTSimulator((orgId, message) => {
  wsServer.broadcastToOrg(orgId, message);
});

// ── Start Server ──
const PORT = config.port;
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║          ⚡ Smart Energy PaaS Server ⚡              ║
╠══════════════════════════════════════════════════════╣
║  REST API:    http://localhost:${PORT}                  ║
║  WebSocket:   ws://localhost:${PORT}/ws                 ║
║  Environment: ${config.nodeEnv.padEnd(36)}║
╚══════════════════════════════════════════════════════╝
  `);

  // Start IoT simulation after 3 seconds
  setTimeout(() => {
    iotSimulator.start(config.simulation.intervalMs);
  }, 3000);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down...');
  iotSimulator.stop();
  server.close(() => {
    console.log('[Server] Closed');
    process.exit(0);
  });
});

module.exports = { app, server };
