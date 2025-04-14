const mongoose = require('mongoose');
const config = require('../config/config');
const { Worker } = require('bullmq');
const { processTradeJob } = require('../services/trade.service');
const { connection } = require('../queues/trade.queue');

require('../models/wallet.model');
require('../models/balance.model');
require('../models/transaction.model');
require('../models/cryptoToken.model');
require('../models/walletUsage.model');

async function startWorker() {
  try {
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    console.log('Worker connected to MongoDB');

    const worker = new Worker(
      'tradeQueue',
      async (job) => {
        try {
          const result = await processTradeJob(job);
          return result;
        } catch (error) {
          console.error('Error processing trade job:', error);
          throw error;
        }
      },
      {
        connection,
        concurrency: 1,
      }
    );

    worker.on('completed', (job, returnvalue) => {
      console.log(`Trade job ${job.id} completed with result:`, returnvalue);
    });

    worker.on('failed', (job, err) => {
      console.error(`Trade job ${job.id} failed:`, err);
    });
  } catch (err) {
    console.error('Error starting worker:', err);
  }
}

startWorker();
