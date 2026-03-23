const config = require('../../config');
const { logger } = require('../../utils/logger');

function randomLatencyMs() {
  return 50 + Math.floor(Math.random() * 51);
}

async function scoreTransaction(transaction) {
  const latencyMs = randomLatencyMs();

  const scoringPromise = new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        score: Number(Math.random().toFixed(4)),
        latencyMs
      });
    }, latencyMs);
  });

  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('ML scoring timeout')), config.fraud.mlTimeoutMs);
  });

  try {
    // Promise.race enforces a hard timeout to protect API latency.
    const result = await Promise.race([scoringPromise, timeoutPromise]);

    return {
      model: 'mock-ml-v1',
      score: result.score,
      latencyMs: result.latencyMs,
      timedOut: false
    };
  } catch (err) {
    logger.warn({ err }, 'ML service timeout, using neutral score');

    return {
      model: 'mock-ml-v1',
      score: 0.5,
      latencyMs: config.fraud.mlTimeoutMs,
      timedOut: true
    };
  }
}

module.exports = {
  scoreTransaction
};
