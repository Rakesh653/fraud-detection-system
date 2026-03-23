const Redis = require('ioredis');
const config = require('../config');
const { logger } = require('../utils/logger');

let redis;

function getRedis() {
  if (!redis) {
    redis = new Redis(config.redis.url, config.redis.clientOptions);

    redis.on('connect', () => {
      logger.info('Redis connected');
    });

    redis.on('error', (err) => {
      logger.warn({ err }, 'Redis error');
    });
  }

  return redis;
}

async function safeRedis(operation, fallbackValue) {
  try {
    const client = getRedis();
    if (client.status !== 'ready') {
      logger.warn({ status: client.status }, 'Redis not ready, falling back');
      return fallbackValue;
    }
    return await operation(client);
  } catch (err) {
    logger.warn({ err }, 'Redis unavailable, falling back');
    return fallbackValue;
  }
}

module.exports = {
  getRedis,
  safeRedis
};
