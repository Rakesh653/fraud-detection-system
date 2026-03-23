const dotenv = require('dotenv');
const { URL } = require('url');

dotenv.config();

function parseRedisUrl(redisUrl) {
  try {
    const url = new URL(redisUrl);
    const dbFromPath = url.pathname && url.pathname !== '/' ? Number(url.pathname.slice(1)) : 0;

    return {
      host: url.hostname || '127.0.0.1',
      port: url.port ? Number(url.port) : 6379,
      username: url.username || undefined,
      password: url.password || undefined,
      db: Number.isFinite(dbFromPath) ? dbFromPath : 0
    };
  } catch (err) {
    return { host: '127.0.0.1', port: 6379, db: 0 };
  }
}

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const redisOptions = parseRedisUrl(redisUrl);

function buildDbConfig() {
  const connectionString = process.env.DATABASE_URL;

  if (connectionString) {
    return {
      connectionString,
      max: Number(process.env.PG_POOL_MAX || 10)
    };
  }

  return {
    host: process.env.PG_HOST || '127.0.0.1',
    port: Number(process.env.PG_PORT || 5432),
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || 'postgres',
    database: process.env.PG_DATABASE || 'fraud_detection',
    max: Number(process.env.PG_POOL_MAX || 10)
  };
}

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  db: buildDbConfig(),
  redis: {
    url: redisUrl,
    clientOptions: {
      ...redisOptions,
      connectTimeout: 500,
      maxRetriesPerRequest: 1
    },
    queueOptions: {
      ...redisOptions,
      // BullMQ recommends this for stable behavior under network blips.
      maxRetriesPerRequest: null
    }
  },
  fraud: {
    amountThreshold: Number(process.env.AMOUNT_THRESHOLD || 10000),
    velocityWindowSec: Number(process.env.VELOCITY_WINDOW_SEC || 60),
    velocityMaxTx: Number(process.env.VELOCITY_MAX_TX || 5),
    decisionCacheTtlSec: Number(process.env.DECISION_CACHE_TTL_SEC || 120),
    mlTimeoutMs: Number(process.env.ML_TIMEOUT_MS || 120)
  },
  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
    max: Number(process.env.RATE_LIMIT_MAX || 120)
  },
  queue: {
    name: process.env.QUEUE_NAME || 'transaction.created',
    workerConcurrency: Number(process.env.WORKER_CONCURRENCY || 5)
  }
};
