const config = require('../../config');
const { getUserHistoryStats } = require('../../models/transactionRepository');
const { logger } = require('../../utils/logger');

function computeHistoricalRisk(transaction, stats) {
  if (!stats || stats.tx_count === 0) {
    return {
      riskScore: 0,
      spike: false,
      highVelocity: false,
      flaggedRate: 0
    };
  }

  const avgAmount = Number(stats.avg_amount || 0);
  const maxAmount = Number(stats.max_amount || 0);
  const spike = avgAmount > 0
    ? transaction.amount > avgAmount * config.fraud.historicalAmountSpike
    : false;

  const highVelocity = stats.tx_count >= config.fraud.historicalMaxTx;
  const flaggedRate = stats.tx_count > 0
    ? Number(((stats.flagged_count + stats.blocked_count) / stats.tx_count).toFixed(4))
    : 0;

  let riskScore = 0;
  if (spike) riskScore += 0.4;
  if (highVelocity) riskScore += 0.3;
  if (flaggedRate >= 0.2) riskScore += 0.2;

  return {
    riskScore: Number(Math.min(1, riskScore).toFixed(4)),
    spike,
    highVelocity,
    flaggedRate,
    avgAmount,
    maxAmount
  };
}

async function analyzeHistoricalPatterns(transaction) {
  try {
    const stats = await getUserHistoryStats(transaction.userId, config.fraud.historicalWindowDays);

    const derived = computeHistoricalRisk(transaction, stats);

    return {
      windowDays: config.fraud.historicalWindowDays,
      txCount: stats.tx_count,
      avgAmount: Number(stats.avg_amount || 0),
      maxAmount: Number(stats.max_amount || 0),
      flaggedCount: stats.flagged_count,
      blockedCount: stats.blocked_count,
      flaggedRate: derived.flaggedRate,
      spike: derived.spike,
      highVelocity: derived.highVelocity,
      riskScore: derived.riskScore
    };
  } catch (err) {
    logger.warn({ err }, 'Historical pattern analysis failed, continuing with defaults');
    return {
      windowDays: config.fraud.historicalWindowDays,
      txCount: 0,
      avgAmount: 0,
      maxAmount: 0,
      flaggedCount: 0,
      blockedCount: 0,
      flaggedRate: 0,
      spike: false,
      highVelocity: false,
      riskScore: 0
    };
  }
}

module.exports = {
  analyzeHistoricalPatterns
};
