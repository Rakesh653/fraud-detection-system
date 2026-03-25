const { query } = require('../db/postgres');

async function upsertFeatureStore(record) {
  const sql = `
    INSERT INTO feature_store (
      transaction_id,
      user_id,
      model_version,
      model_score,
      features,
      created_at
    ) VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (transaction_id)
    DO UPDATE SET
      model_version = EXCLUDED.model_version,
      model_score = EXCLUDED.model_score,
      features = EXCLUDED.features,
      created_at = EXCLUDED.created_at
  `;

  const values = [
    record.transactionId,
    record.userId,
    record.modelVersion,
    record.modelScore,
    JSON.stringify(record.features),
    record.createdAt
  ];

  await query(sql, values);
}

module.exports = {
  upsertFeatureStore
};
