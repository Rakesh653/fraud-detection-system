const { randomInt, createHash } = require('crypto');
const config = require('../../config');

function simulateLatency() {
  return 20 + randomInt(30);
}

function hasWatchlistMatch(userId, deviceId) {
  const userIds = config.fraud.watchlistUserIds || [];
  const deviceIds = config.fraud.watchlistDeviceIds || [];

  const matches = [];
  if (userId && userIds.includes(userId)) {
    matches.push({ type: 'user', value: userId, list: 'user-watchlist' });
  }
  if (deviceId && deviceIds.includes(deviceId)) {
    matches.push({ type: 'device', value: deviceId, list: 'device-watchlist' });
  }

  if (matches.length > 0) {
    return { matched: true, matches, risk: 0.9 };
  }

  if (!userId && !deviceId) {
    return { matched: false, matches: [], risk: 0.05 };
  }

  const seed = createHash('sha256')
    .update(`${userId || 'na'}:${deviceId || 'na'}`)
    .digest('hex');
  const bucket = parseInt(seed.slice(0, 8), 16) / 0xffffffff;
  const matched = bucket > 0.985;

  return {
    matched,
    matches: matched
      ? [{ type: 'heuristic', value: userId || deviceId || 'unknown', list: 'heuristic-watchlist' }]
      : [],
    risk: matched ? 0.7 : 0.1
  };
}

async function checkWatchlist(transaction) {
  const latencyMs = simulateLatency();

  return new Promise((resolve) => {
    setTimeout(() => {
      const result = hasWatchlistMatch(transaction.userId, transaction.deviceId);

      resolve({
        matched: result.matched,
        matches: result.matches,
        risk: Number(result.risk.toFixed(4)),
        latencyMs,
        source: 'watchlist-stub'
      });
    }, latencyMs);
  });
}

module.exports = {
  checkWatchlist
};
