const { query } = require('../db/postgres');

async function insertTransaction(record) {
  const sql = `
    INSERT INTO transactions (
      transaction_id,
      user_id,
      amount,
      status,
      fraud_score,
      created_at,
      device_id,
      ip_address,
      card_bin,
      provider,
      gateway_event_id,
      gateway_status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
  `;

  const values = [
    record.transactionId,
    record.userId,
    record.amount,
    record.status,
    record.fraudScore,
    record.createdAt,
    record.deviceId || null,
    record.ipAddress || null,
    record.cardBin || null,
    record.provider || null,
    record.gatewayEventId || null,
    record.gatewayStatus || null
  ];

  await query(sql, values);
}

async function getUserHistoryStats(userId, windowDays) {
  const sql = `
    SELECT
      COUNT(*)::int AS tx_count,
      COALESCE(AVG(amount), 0) AS avg_amount,
      COALESCE(MAX(amount), 0) AS max_amount,
      SUM(CASE WHEN status = 'FLAG' THEN 1 ELSE 0 END)::int AS flagged_count,
      SUM(CASE WHEN status = 'BLOCK' THEN 1 ELSE 0 END)::int AS blocked_count
    FROM transactions
    WHERE user_id = $1
      AND created_at >= NOW() - ($2::int * INTERVAL '1 day')
  `;

  const result = await query(sql, [userId, windowDays]);
  return result.rows[0];
}

async function getTransactionById(transactionId) {
  const sql = `
    SELECT *
    FROM transactions
    WHERE transaction_id = $1
    LIMIT 1
  `;

  const result = await query(sql, [transactionId]);
  return result.rows[0] || null;
}

async function getTransactionByGatewayEvent(provider, gatewayEventId) {
  const sql = `
    SELECT *
    FROM transactions
    WHERE provider = $1
      AND gateway_event_id = $2
    LIMIT 1
  `;

  const result = await query(sql, [provider, gatewayEventId]);
  return result.rows[0] || null;
}

async function updateGatewayInfoById(transactionId, fields) {
  const sql = `
    UPDATE transactions
    SET provider = $2,
        gateway_event_id = $3,
        gateway_status = $4
    WHERE transaction_id = $1
  `;

  await query(sql, [
    transactionId,
    fields.provider || null,
    fields.gatewayEventId || null,
    fields.gatewayStatus || null
  ]);
}

async function updateGatewayStatusByGatewayEvent(provider, gatewayEventId, gatewayStatus) {
  const sql = `
    UPDATE transactions
    SET gateway_status = $3
    WHERE provider = $1
      AND gateway_event_id = $2
  `;

  await query(sql, [provider, gatewayEventId, gatewayStatus || null]);
}

module.exports = {
  insertTransaction,
  getUserHistoryStats,
  getTransactionById,
  getTransactionByGatewayEvent,
  updateGatewayInfoById,
  updateGatewayStatusByGatewayEvent
};
