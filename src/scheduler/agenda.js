const Agenda = require('agenda');
const config = require('../config/config'); // Your config with MongoDB URL

// Initialize Agenda with MongoDB
const agenda = new Agenda({ db: { address: config.mongoose.url, collection: 'agendaJobs' } });

// Define a job for wallet generation
agenda.define('wallet generation', async job => {
  const { runSchedulerTask } = require('../services/schedulerService');
  await runSchedulerTask('WalletGeneration');
});

// Define a job for token distribution
agenda.define('token distribution', async job => {
  const { runSchedulerTask } = require('../services/schedulerService');
  await runSchedulerTask('TokenDistribution');
});

// Function to load scheduler configs from the DB and schedule jobs
async function scheduleJobs() {
  const SchedulerConfig = require('../models/schedulerConfig.model');
  const configs = await SchedulerConfig.find({ enabled: true });
  for (const config of configs) {
    // Cancel existing jobs for this scheduler (if needed)
    await agenda.cancel({ name: config.name });
    if (config.name === 'WalletGeneration') {
      await agenda.every(config.cronExpression, 'wallet generation');
      console.log(`Scheduled WalletGeneration job with cron: ${config.cronExpression}`);
    } else if (config.name === 'TokenDistribution') {
      await agenda.every(config.cronExpression, 'token distribution');
      console.log(`Scheduled TokenDistribution job with cron: ${config.cronExpression}`);
    }
  }
  await agenda.start();
}

module.exports = { agenda, scheduleJobs };
