const { Agenda } = require('agenda');
const config = require('../config/config'); // Your config with MongoDB URL
const SchedulerConfig = require('../models/schedulerConfig.model');
const { runSchedulerTask } = require('../services/scheduler.service');
const cronValidator = require('cron-validator'); // Add missing import

const JOB_CONFIGURATION = {
  WalletGeneration: {
    agendaName: 'wallet generation',
    concurrency: 1,
  },
  TokenDistribution: {
    agendaName: 'token distribution',
    concurrency: 1,
  },
};

// Initialize Agenda with MongoDB
const agenda = new Agenda({ db: { address: config.mongoose.url, collection: 'agendaJobs' } });

// Define a job for wallet generation
agenda.define('wallet generation', async (job) => {
  await runSchedulerTask('WalletGeneration');
});

// Define a job for token distribution
agenda.define('token distribution', async (job) => {
  await runSchedulerTask('TokenDistribution');
});

// Function to load scheduler configs from the DB and schedule jobs
async function scheduleJobs() {
  try {
    const configs = await SchedulerConfig.find().lean();
    // console.log('Loaded scheduler configs:', configs);
    await agenda.cancel({});

    for (const config of configs) {
      if (config.enabled) {
        await agenda.every(config.cronExpression, JOB_CONFIGURATION[config.name].agendaName);
      }
    }

    await agenda.start();
    await setupConfigWatcher(); // Now uses local function
    console.log('Dynamic scheduling active');
  } catch (error) {
    console.error('Initial scheduling failed:', error);
    process.exit(1);
  }
}

async function rescheduleSingleJob(config) {
  try {
    console.log(`Rescheduling job for ${config.name}...`);
    // Validate cron first
    if (!cronValidator.isValidCron(config.cronExpression)) {
      throw new Error(`Invalid cron: ${config.cronExpression}`);
    }

    // Cancel existing jobs
    await agenda.cancel({ name: config.name });

    if (config.enabled) {
      // Schedule new job
      await agenda.every(config.cronExpression, JOB_CONFIGURATION[config.name].agendaName);
      console.log(`Rescheduled ${config.name} with ${config.cronExpression}`);

      // Immediate execution if requested
      if (config.triggerImmediately) {
        await agenda.now(JOB_CONFIGURATION[config.name].agendaName);
        await SchedulerConfig.updateOne({ _id: config._id }, { $set: { triggerImmediately: false } });
      }
    }
  } catch (error) {
    console.error(`Rescheduling failed for ${config.name}:`, error);
    // Add retry logic or alert here
  }
}

async function setupConfigWatcher() {
  console.log('Setting up change stream for scheduler configs...');
  const collection = SchedulerConfig.collection;
  const changeStream = collection.watch([], { fullDocument: 'updateLookup' });

  changeStream.on('change', async (change) => {
    if (change.operationType === 'update' || change.operationType === 'replace') {
      const config = change.fullDocument;
      await rescheduleSingleJob(config);
    }
  });

  changeStream.on('error', (error) => {
    console.error('Change stream error:', error);
  });
}

module.exports = { agenda, scheduleJobs, rescheduleSingleJob };
