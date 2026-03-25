CREATE TABLE IF NOT EXISTS transactions (
  transaction_id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  status TEXT NOT NULL,
  fraud_score NUMERIC(5, 4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS device_id TEXT,
  ADD COLUMN IF NOT EXISTS ip_address TEXT,
  ADD COLUMN IF NOT EXISTS card_bin TEXT,
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS gateway_event_id TEXT,
  ADD COLUMN IF NOT EXISTS gateway_status TEXT;

CREATE INDEX IF NOT EXISTS idx_transactions_user_created
  ON transactions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_device_created
  ON transactions (device_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_gateway_event
  ON transactions (provider, gateway_event_id)
  WHERE provider IS NOT NULL AND gateway_event_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS feature_store (
  transaction_id UUID PRIMARY KEY REFERENCES transactions(transaction_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  model_version TEXT,
  model_score NUMERIC(5, 4),
  features JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feature_store_user_created
  ON feature_store (user_id, created_at DESC);
