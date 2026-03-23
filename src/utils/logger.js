const pino = require('pino');
const pinoHttp = require('pino-http');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: { service: 'fraud-detection-api' }
});

const httpLogger = pinoHttp({
  logger,
  customLogLevel: function (res, err) {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  }
});

module.exports = {
  logger,
  httpLogger
};
