const { randomUUID } = require('crypto');
const { query } = require('./postgres');
const { logger } = require('../utils/logger');

async function seed() {
  const userId = process.env.TEST_USER_ID || 'test-user';
  const now = Date.now();

  const samples = [
    { amount: 120, status: 'APPROVE', score: 0.12, hoursAgo: 36 },
    { amount: 180, status: 'APPROVE', score: 0.18, hoursAgo: 30 },
    { amount: 220, status: 'FLAG', score: 0.62, hoursAgo: 18 },
    { amount: 140, status: 'APPROVE', score: 0.22, hoursAgo: 12 },
    { amount: 260, status: 'APPROVE', score: 0.25, hoursAgo: 6 }
  ];

  for (const sample of samples) {
    const createdAt = new Date(now - sample.hoursAgo * 3600 * 1000).toISOString();

    await query(
      `INSERT INTO transactions (
        transaction_id,
        user_id,
        amount,
        status,
        fraud_score,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [randomUUID(), userId, sample.amount, sample.status, sample.score, createdAt]
    );
  }

  logger.info({ userId }, 'Seed data inserted');
  process.exit(0);
}

seed().catch((err) => {
  logger.error({ err }, 'Seed failed');
  process.exit(1);
});
