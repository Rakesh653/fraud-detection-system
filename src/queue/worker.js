const { Worker } = require('bullmq');
const config = require('../config');
const { logger } = require('../utils/logger');

function randomLatencyMs() {
  return 200 + Math.floor(Math.random() * 301);
}

function simulateDeepAnalysis(transaction) {
  const latencyMs = randomLatencyMs();

  return new Promise((resolve) => {
    setTimeout(() => {
      const score = Number(Math.random().toFixed(4));
      resolve({
        deepScore: score,
        latencyMs,
        recommendation: score > 0.85 ? 'ESCALATE' : 'MONITOR'
      });
    }, latencyMs);
  });
}

function startWorker() {
  const worker = new Worker(
    config.queue.name,
    async (job) => {
      logger.info({ jobId: job.id, transaction: job.data }, 'Processing transaction event');

      const analysis = await simulateDeepAnalysis(job.data);
      logger.info(
        { jobId: job.id, analysis },
        'Deep fraud analysis complete'
      );

      return analysis;
    },
    {
      connection: config.redis.queueOptions,
      concurrency: config.queue.workerConcurrency
    }
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Queue job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Queue job failed');
  });

  return worker;
}

const worker = startWorker();

process.on('SIGINT', async () => {
  logger.info('Worker shutting down');
  await worker.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Worker shutting down');
  await worker.close();
  process.exit(0);
});
