const { Queue } = require('bullmq');
const config = require('../config');
const { logger } = require('../utils/logger');

let queue;

function getQueue() {
  if (!queue) {
    queue = new Queue(config.queue.name, {
      connection: config.redis.queueOptions
    });
  }

  return queue;
}

async function enqueueTransaction(payload) {
  try {
    const queueInstance = getQueue();
    const job = await queueInstance.add('transaction.created', payload, {
      removeOnComplete: 1000,
      removeOnFail: 1000
    });

    return job;
  } catch (err) {
    logger.warn({ err }, 'Failed to enqueue transaction');
    return null;
  }
}

module.exports = {
  getQueue,
  enqueueTransaction
};
