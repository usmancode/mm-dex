const { Queue } = require('bullmq');
const IORedis = require('ioredis');

const connection = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null,
});

// Ensure the queue name matches the one used in your app
const tradeQueue = new Queue('tradeQueue', { connection });

async function printQueueStatus() {
  try {
    const counts = await tradeQueue.getJobCounts();
    console.log('Trade Queue Job Counts:');
    console.log(counts);
  } catch (error) {
    console.error('Error fetching queue status:', error);
  } finally {
    process.exit(0);
  }
}

printQueueStatus();
