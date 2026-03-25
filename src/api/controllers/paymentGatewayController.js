const { randomUUID } = require('crypto');
const { processTransaction } = require('../../services/transactionService');
const { enqueueTransaction } = require('../../queue/producer');
const { logger } = require('../../utils/logger');
const { normalizeWebhookPayload } = require('../../integrations/paymentGateway/adapter');
const { verifyWebhookSignature } = require('../../integrations/paymentGateway/webhookVerifier');

async function handlePaymentWebhook(req, res, next) {
  try {
    const verification = verifyWebhookSignature(req);
    if (!verification.valid) {
      return res.status(401).json({ error: 'Invalid webhook signature', reason: verification.reason });
    }

    const { normalized, missing, shouldProcess } = normalizeWebhookPayload(req.body || {});
    if (missing.length > 0) {
      return res.status(400).json({
        error: 'Invalid webhook payload',
        missing
      });
    }

    if (!shouldProcess) {
      return res.status(202).json({
        status: 'ignored',
        reason: `Webhook status ${normalized.status} not processed`
      });
    }

    const transaction = {
      id: randomUUID(),
      userId: normalized.userId,
      amount: normalized.amount,
      deviceId: normalized.deviceId,
      cardBin: normalized.cardBin,
      ipAddress: normalized.ipAddress,
      gatewayEventId: normalized.gatewayEventId,
      provider: normalized.provider,
      createdAt: new Date().toISOString()
    };

    logger.info({ transaction }, 'Payment gateway webhook received');

    const decision = await processTransaction(transaction);

    logger.info({
      transactionId: transaction.id,
      decision: decision.decision,
      score: decision.score
    }, 'Fraud decision generated for gateway webhook');

    res.status(200).json({
      status: 'processed',
      decision
    });

    setImmediate(async () => {
      await enqueueTransaction({
        transaction,
        decision,
        source: 'payment-gateway'
      });
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handlePaymentWebhook
};
