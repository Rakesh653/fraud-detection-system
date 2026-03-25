const express = require('express');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const transactionRoutes = require('./api/routes/transactionRoutes');
const paymentGatewayRoutes = require('./api/routes/paymentGatewayRoutes');
const { httpLogger, logger } = require('./utils/logger');
const { healthCheck } = require('./db/postgres');
const { getRedis } = require('./cache/redisClient');
const { gatewayAuth } = require('./gateway/auth');

const app = express();

app.use(httpLogger);
app.use(express.json({ limit: '1mb' }));
app.use(gatewayAuth);

app.use(
  rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.get('/health', async (req, res) => {
  const db = await healthCheck();
  const redis = getRedis();

  res.json({
    status: 'ok',
    db,
    redis: { status: redis.status }
  });
});

app.use('/', transactionRoutes);
app.use('/', paymentGatewayRoutes);

app.use((err, req, res, next) => {
  logger.error({ err }, 'Unhandled error');
  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal server error',
    details: err.details
  });
});

module.exports = app;
