CREATE TABLE IF NOT EXISTS transactions (
  transaction_id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  status TEXT NOT NULL,
  fraud_score NUMERIC(5, 4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_created
  ON transactions (user_id, created_at DESC);
