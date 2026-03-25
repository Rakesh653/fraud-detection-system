const config = require('../../config');
const { HttpAdapter } = require('../adapters/httpAdapter');

let adapter;

function getAdapter() {
  if (!adapter) {
    adapter = new HttpAdapter({
      name: 'ml-scoring',
      baseUrl: config.integrations.scoring.endpoint,
      timeoutMs: config.integrations.scoring.timeoutMs,
      retries: config.integrations.scoring.retries,
      backoffMs: config.integrations.scoring.backoffMs,
      circuitBreaker: config.integrations.scoring.circuitBreaker
    });
  }

  return adapter;
}

async function scoreWithExternalModel(transaction, context) {
  const payload = {
    transaction: {
      userId: transaction.userId,
      amount: transaction.amount,
      deviceId: transaction.deviceId,
      cardBin: transaction.cardBin || null,
      ipAddress: transaction.ipAddress || null
    },
    signals: context?.signals || {},
    historical: context?.historical || {}
  };

  const response = await getAdapter().post('', payload);

  return {
    model: response?.model || 'external-ml',
    score: Number(response?.score ?? 0.5),
    latencyMs: Number(response?.latencyMs ?? 0),
    featuresUsed: response?.featuresUsed || null
  };
}

module.exports = {
  scoreWithExternalModel
};
