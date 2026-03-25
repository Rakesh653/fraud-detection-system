const { lookupBin } = require('../../integrations/fraudSignals/binLookup');
const { fingerprintDevice } = require('../../integrations/fraudSignals/deviceFingerprint');
const { checkIpReputation } = require('../../integrations/fraudSignals/ipReputation');
const { checkWatchlist } = require('../../integrations/fraudSignals/watchlist');
const { checkWatchlistExternal } = require('../../integrations/fraudSignals/watchlistClient');
const { logger } = require('../../utils/logger');
const config = require('../../config');

// Compute a single enrichment risk score from multiple signal sources.
function calculateAggregateRisk(signals) {
  const values = [
    signals.bin?.risk ?? 0,
    signals.device?.risk ?? 0,
    signals.ip?.risk ?? 0,
    signals.watchlist?.risk ?? 0
  ];

  const average = values.reduce((sum, val) => sum + val, 0) / values.length;
  return Number(average.toFixed(4));
}

// Fetch external/stubbed signals to enrich a transaction.
async function enrichTransaction(transaction) {
  try {
    const watchlistPromise = config.integrations.watchlist.enabled
      ? checkWatchlistExternal(transaction).catch((err) => {
        logger.warn({ err }, 'External watchlist failed, falling back to stub');
        return checkWatchlist(transaction);
      })
      : checkWatchlist(transaction);

    const [bin, device, ip, watchlist] = await Promise.all([
      lookupBin(transaction.cardBin),
      fingerprintDevice(transaction.deviceId),
      checkIpReputation(transaction.ipAddress),
      watchlistPromise
    ]);

    const signals = {
      bin,
      device,
      ip,
      watchlist
    };

    return {
      ...signals,
      riskScore: calculateAggregateRisk(signals)
    };
  } catch (err) {
    logger.warn({ err }, 'Fraud signal enrichment failed, continuing with defaults');

    return {
      bin: { risk: 0 },
      device: { risk: 0 },
      ip: { risk: 0 },
      watchlist: { risk: 0 },
      riskScore: 0
    };
  }
}

module.exports = {
  enrichTransaction
};
