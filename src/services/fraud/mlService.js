const config = require('../../config');
const { logger } = require('../../utils/logger');
const { scoreWithExternalModel } = require('../../integrations/ml/mlScoringClient');

// Simulate ML service latency window.
function randomLatencyMs() {
  return 50 + Math.floor(Math.random() * 51);
}

// Compute a mock ML score from transaction + enrichment context.
function computeScore(transaction, context) {
  const amountThreshold = config.fraud.amountThreshold || 10000;
  const amountFactor = Math.min(transaction.amount / (amountThreshold * 2), 1) * 0.4;
  const signalFactor = Math.min(context?.signals?.riskScore || 0, 1) * 0.3;
  const historicalFactor = Math.min(context?.historical?.riskScore || 0, 1) * 0.3;
  const noise = Math.random() * 0.2;

  return Number(Math.min(1, amountFactor + signalFactor + historicalFactor + noise).toFixed(4));
}

// Select external scoring when enabled, otherwise use local mock scoring.
async function performScoring(transaction, context) {
  if (config.integrations.scoring.enabled) {
    try {
      const externalResult = await scoreWithExternalModel(transaction, context);
      return {
        model: externalResult.model || 'external-ml',
        score: externalResult.score,
        latencyMs: externalResult.latencyMs || 0,
        source: 'external'
      };
    } catch (err) {
      logger.warn({ err }, 'External ML scoring failed, falling back to mock');
    }
  }

  const latencyMs = randomLatencyMs();
  await new Promise((resolve) => setTimeout(resolve, latencyMs));

  return {
    model: 'mock-ml-v1',
    score: computeScore(transaction, context),
    latencyMs,
    source: 'mock'
  };
}

// Public ML scoring API with timeout protection.
async function scoreTransaction(transaction, context) {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('ML scoring timeout')), config.fraud.mlTimeoutMs);
  });

  try {
    // Promise.race enforces a hard timeout to protect API latency.
    const result = await Promise.race([performScoring(transaction, context), timeoutPromise]);

    return {
      model: result.model,
      score: result.score,
      latencyMs: result.latencyMs || 0,
      source: result.source,
      features: {
        amount: transaction.amount,
        riskSignals: context?.signals?.riskScore ?? 0,
        historicalRisk: context?.historical?.riskScore ?? 0
      },
      timedOut: false
    };
  } catch (err) {
    logger.warn({ err }, 'ML service timeout, using neutral score');

    return {
      model: 'mock-ml-v1',
      score: 0.5,
      latencyMs: config.fraud.mlTimeoutMs,
      source: 'timeout',
      features: {
        amount: transaction.amount,
        riskSignals: context?.signals?.riskScore ?? 0,
        historicalRisk: context?.historical?.riskScore ?? 0
      },
      timedOut: true
    };
  }
}

module.exports = {
  scoreTransaction
};
