const { Pool } = require('pg');
const config = require('../config');
const { logger } = require('../utils/logger');

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool(config.db);

    pool.on('error', (err) => {
      logger.error({ err }, 'PostgreSQL pool error');
    });
  }

  return pool;
}

async function query(text, params) {
  const client = await getPool().connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

async function healthCheck() {
  try {
    await query('SELECT 1');
    return { ok: true };
  } catch (err) {
    logger.error({ err }, 'PostgreSQL health check failed');
    return { ok: false, error: err.message };
  }
}

module.exports = {
  getPool,
  query,
  healthCheck
};
