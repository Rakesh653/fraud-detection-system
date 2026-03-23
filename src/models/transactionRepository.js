const { query } = require('../db/postgres');

async function insertTransaction(record) {
  const sql = `
    INSERT INTO transactions (
      transaction_id,
      user_id,
      amount,
      status,
      fraud_score,
      created_at
    ) VALUES ($1, $2, $3, $4, $5, $6)
  `;

  const values = [
    record.transactionId,
    record.userId,
    record.amount,
    record.status,
    record.fraudScore,
    record.createdAt
  ];

  await query(sql, values);
}

module.exports = {
  insertTransaction
};
