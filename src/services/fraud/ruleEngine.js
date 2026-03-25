const config = require('../../config');
const { safeRedis } = require('../../cache/redisClient');

// Check short-term transaction velocity using Redis counters.
async function checkVelocity(userId) {
  const key = `velocity:${userId}`;

  const result = await safeRedis(async (redis) => {
    // TTL-backed counter enforces velocity limits without permanent storage.
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, config.fraud.velocityWindowSec);
    }

    return {
      count,
      windowSec: config.fraud.velocityWindowSec,
      exceeded: count > config.fraud.velocityMaxTx,
      skipped: false
    };
  }, {
    count: null,
    windowSec: config.fraud.velocityWindowSec,
    exceeded: false,
    skipped: true
  });

  return {
    id: 'velocity_check',
    passed: !result.exceeded,
    reason: result.skipped
      ? 'Velocity check skipped (Redis unavailable)'
      : `User has ${result.count} tx in ${result.windowSec}s`,
    meta: result
  };
}

// Check if a single transaction exceeds configured amount threshold.
function checkAmount(amount) {
  const exceeded = amount > config.fraud.amountThreshold;

  return {
    id: 'amount_threshold',
    passed: !exceeded,
    reason: exceeded
      ? `Amount exceeds ${config.fraud.amountThreshold}`
      : 'Amount within threshold',
    meta: {
      amount,
      threshold: config.fraud.amountThreshold
    }
  };
}

// Run all synchronous rule checks for a transaction.
async function runRules(transaction) {
  const velocityResult = await checkVelocity(transaction.userId);
  const amountResult = checkAmount(transaction.amount);

  return [velocityResult, amountResult];
}

module.exports = {
  runRules
};
