const app = require('./app');
const config = require('./config');
const { logger } = require('./utils/logger');

const server = app.listen(config.port, () => {
  logger.info({ port: config.port }, 'Fraud detection API listening');
});

process.on('SIGINT', () => {
  logger.info('API shutting down');
  server.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
  logger.info('API shutting down');
  server.close(() => process.exit(0));
});
