const { randomUUID } = require('crypto');
const { processTransaction } = require('../../services/transactionService');
const { enqueueTransaction } = require('../../queue/producer');
const { logger } = require('../../utils/logger');

async function createTransaction(req, res, next) {
  try {
    const { userId, amount, deviceId, cardBin, ipAddress } = req.body || {};
    const normalizedAmount = Number(amount);
    const forwardedFor = req.header('x-forwarded-for');
    const resolvedIp = ipAddress
      || (typeof forwardedFor === 'string' ? forwardedFor.split(',')[0].trim() : null)
      || req.ip
      || null;

    if (!userId || !deviceId || !Number.isFinite(normalizedAmount)) {
      return res.status(400).json({
        error: 'Invalid payload. Required: userId (string), amount (number), deviceId (string).'
      });
    }

    const transaction = {
      id: randomUUID(),
      userId,
      amount: normalizedAmount,
      deviceId,
      cardBin: cardBin || null,
      ipAddress: resolvedIp || null,
      createdAt: new Date().toISOString()
    };

    logger.info({ transaction }, 'Incoming transaction');

    const decision = await processTransaction(transaction);

    logger.info({
      transactionId: transaction.id,
      decision: decision.decision,
      score: decision.score
    }, 'Fraud decision generated');

    res.status(200).json(decision);

    setImmediate(async () => {
      // Async event processing keeps API latency low and decouples heavy analysis.
      await enqueueTransaction({
        transaction,
        decision
      });
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createTransaction
};
