const { randomUUID } = require('crypto');
const { processTransaction } = require('../../services/transactionService');
const { enqueueTransaction } = require('../../queue/producer');
const { logger } = require('../../utils/logger');
const { normalizeWebhookPayload } = require('../../integrations/paymentGateway/adapter');
const { verifyWebhookSignature } = require('../../integrations/paymentGateway/webhookVerifier');
const {
  getTransactionById,
  getTransactionByGatewayEvent,
  updateGatewayInfoById,
  updateGatewayStatusByGatewayEvent
} = require('../../models/transactionRepository');

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

    if (normalized.transactionId) {
      const existing = await getTransactionById(normalized.transactionId);

      if (existing) {
        await updateGatewayInfoById(existing.transaction_id, {
          provider: normalized.provider,
          gatewayEventId: normalized.gatewayEventId,
          gatewayStatus: normalized.status
        });

        return res.status(200).json({
          status: 'updated',
          transactionId: existing.transaction_id,
          decision: {
            status: existing.status,
            fraudScore: existing.fraud_score
          }
        });
      }
    }

    if (normalized.provider && normalized.gatewayEventId) {
      const existingByGateway = await getTransactionByGatewayEvent(
        normalized.provider,
        normalized.gatewayEventId
      );

      if (existingByGateway) {
        await updateGatewayStatusByGatewayEvent(
          normalized.provider,
          normalized.gatewayEventId,
          normalized.status
        );

        return res.status(200).json({
          status: 'duplicate',
          transactionId: existingByGateway.transaction_id,
          decision: {
            status: existingByGateway.status,
            fraudScore: existingByGateway.fraud_score
          }
        });
      }
    }

    const transaction = {
      id: normalized.transactionId || randomUUID(),
      userId: normalized.userId,
      amount: normalized.amount,
      deviceId: normalized.deviceId,
      cardBin: normalized.cardBin,
      ipAddress: normalized.ipAddress,
      gatewayEventId: normalized.gatewayEventId,
      gatewayStatus: normalized.status,
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
