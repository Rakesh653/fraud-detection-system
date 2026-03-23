const config = require('../config');
const { safeRedis } = require('../cache/redisClient');
const { hashPayload } = require('../utils/hash');
const { runRules } = require('./fraud/ruleEngine');
const { scoreTransaction } = require('./fraud/mlService');
const { aggregate } = require('./fraud/aggregator');
const { logger } = require('../utils/logger');
const { insertTransaction } = require('../models/transactionRepository');
const { AppError } = require('../utils/errors');

async function getCachedDecision(cacheKey) {
  return safeRedis(async (redis) => {
    const cached = await redis.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  }, null);
}

async function setCachedDecision(cacheKey, decision) {
  return safeRedis(async (redis) => {
    await redis.set(
      cacheKey,
      JSON.stringify(decision),
      'EX',
      config.fraud.decisionCacheTtlSec
    );
    return true;
  }, false);
}

async function processTransaction(transaction) {
  const cacheKey = `decision:${hashPayload({
    userId: transaction.userId,
    amount: transaction.amount,
    deviceId: transaction.deviceId
  })}`;

  // Short-lived cache keeps responses fast while avoiding repeated scoring bursts.
  const cached = await getCachedDecision(cacheKey);
  if (cached) {
    const decision = {
      transactionId: transaction.id,
      userId: transaction.userId,
      amount: transaction.amount,
      deviceId: transaction.deviceId,
      decision: cached.decision,
      score: cached.score,
      triggeredRules: cached.triggeredRules,
      ruleResults: cached.ruleResults,
      mlResult: cached.mlResult,
      evaluatedAt: cached.evaluatedAt,
      cache: { hit: true, key: cacheKey }
    };

    try {
      await insertTransaction({
        transactionId: decision.transactionId,
        userId: decision.userId,
        amount: decision.amount,
        status: decision.decision,
        fraudScore: decision.score,
        createdAt: transaction.createdAt
      });
    } catch (err) {
      logger.error({ err, transactionId: decision.transactionId }, 'Failed to persist transaction');
      throw new AppError('Database unavailable. Transaction not stored.', 503, err.message);
    }

    return decision;
  }

  const ruleResults = await runRules(transaction);
  const mlResult = await scoreTransaction(transaction);
  const aggregated = aggregate(ruleResults, mlResult);

  const decisionSnapshot = {
    decision: aggregated.decision,
    score: aggregated.score,
    triggeredRules: aggregated.triggeredRules,
    ruleResults: aggregated.ruleResults,
    mlResult: aggregated.mlResult,
    evaluatedAt: new Date().toISOString()
  };

  const decision = {
    transactionId: transaction.id,
    userId: transaction.userId,
    amount: transaction.amount,
    deviceId: transaction.deviceId,
    ...decisionSnapshot,
    cache: { hit: false, key: cacheKey }
  };

  try {
    await insertTransaction({
      transactionId: decision.transactionId,
      userId: decision.userId,
      amount: decision.amount,
      status: decision.decision,
      fraudScore: decision.score,
      createdAt: transaction.createdAt
    });
  } catch (err) {
    logger.error({ err, transactionId: decision.transactionId }, 'Failed to persist transaction');
    throw new AppError('Database unavailable. Transaction not stored.', 503, err.message);
  }

  const cachedStored = await setCachedDecision(cacheKey, decisionSnapshot);
  if (!cachedStored) {
    logger.warn({ cacheKey }, 'Failed to cache decision');
  }

  return decision;
}

module.exports = {
  processTransaction
};
