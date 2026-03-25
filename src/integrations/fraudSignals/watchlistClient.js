const config = require('../../config');
const { HttpAdapter } = require('../adapters/httpAdapter');

let adapter;

function getAdapter() {
  if (!adapter) {
    adapter = new HttpAdapter({
      name: 'watchlist',
      baseUrl: config.integrations.watchlist.endpoint,
      timeoutMs: config.integrations.watchlist.timeoutMs,
      retries: config.integrations.watchlist.retries,
      backoffMs: config.integrations.watchlist.backoffMs,
      circuitBreaker: config.integrations.watchlist.circuitBreaker
    });
  }

  return adapter;
}

async function checkWatchlistExternal(transaction) {
  const payload = {
    userId: transaction.userId,
    deviceId: transaction.deviceId,
    cardBin: transaction.cardBin || null,
    ipAddress: transaction.ipAddress || null
  };

  const response = await getAdapter().post('', payload);

  return {
    matched: Boolean(response?.matched),
    matches: response?.matches || [],
    risk: Number(response?.risk ?? 0.5),
    latencyMs: Number(response?.latencyMs ?? 0),
    source: response?.source || 'watchlist-external'
  };
}

module.exports = {
  checkWatchlistExternal
};
