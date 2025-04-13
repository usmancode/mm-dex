// src/queues/trade.queue.js
const { Queue } = require('bullmq');
const IORedis = require('ioredis');

const connection = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null, // Important: set to null per BullMQ requirement
});

const tradeQueue = new Queue('tradeQueue', { connection });

module.exports = { tradeQueue, connection };
