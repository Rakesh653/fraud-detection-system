const fs = require('fs');
const path = require('path');
const { query } = require('./postgres');
const { logger } = require('../utils/logger');

async function migrate() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  try {
    await query(sql);
    logger.info('Database migration complete');
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'Database migration failed');
    process.exit(1);
  }
}

migrate();
