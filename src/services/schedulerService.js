const SchedulerConfig = require('../models/schedulerConfig.model');
const SchedulerLog = require('../models/schedulerLog.model');
const { generateWalletsForConfig } = require('./walletGenerationService');
const { distributeToActiveWallets } = require('./distributionService');
const { returnAllFundsToMaster } = require('./returnService');
const SchedulerTypes = require('../enums/schedulerTypes');
const { rescheduleSingleJob } = require('../../src/scheduler/agenda');

async function runSchedulerTask(schedulerName) {
  // Find the scheduler configuration by name
  const schedulerConfig = await SchedulerConfig.findOne({ name: schedulerName, enabled: true });
  if (!schedulerConfig) {
    console.log(`No scheduler config found for ${schedulerName}`);
    return;
  }
  const startTime = new Date();
  let affectedRows = 0;
  let message = '';

  try {
    if (schedulerName === SchedulerTypes.WALLET_GENERATION) {
      const WalletGenerationConfig = require('../models/walletGenerationConfig.model');
      // Find all enabled wallet generation configurations (for all networks)
      const walletGenConfigs = await WalletGenerationConfig.find({ enabled: true });
      if (!walletGenConfigs || walletGenConfigs.length === 0) {
        throw new Error('No enabled wallet generation configurations found.');
      }

      for (const config of walletGenConfigs) {
        const generated = await generateWalletsForConfig(config);
        console.log(`Generated ${generated} addresses for network ${config.chainId}`);
        affectedRows += generated;
      }
      message = `Generated a total of ${affectedRows} addresses across ${walletGenConfigs.length} config(s).`;
    } else if (schedulerName === SchedulerTypes.TOKEN_DISTRIBUTION) {
      const DistReturnConfig = require('../models/distReturnConfig.model');
      const distConfigs = await DistReturnConfig.find({ enabled: true })
        .populate('tokenA')
        .populate('tokenB')
        .populate('masterWallet');
      for (const config of distConfigs) {
        console.log(`Distributing tokens for network ${config}`);
        const count = await distributeToActiveWallets(config);
        console.log(`Distributed ${count} tokens for network ${config.chainId}`);
        affectedRows += count || 0;
      }

      const returnConfigs = await DistReturnConfig.find({ returnEnabled: true }).populate('tokenA').populate('tokenB');

      for (const config of returnConfigs) {
        const count = await returnAllFundsToMaster(config);
        affectedRows += count || 0;
      }
    }

    schedulerConfig.lastRun = startTime;
    await schedulerConfig.save();
    const endTime = new Date();
    const log = new SchedulerLog({
      schedulerConfig: schedulerConfig._id,
      startTime,
      endTime,
      affectedRows,
      message,
      success: true,
    });
    await log.save();
    console.log(`Scheduler task ${schedulerName} executed. ${message}`);
  } catch (error) {
    console.error(`Critical error in scheduler ${schedulerName}:`, error);
    const endTime = new Date();
    const log = new SchedulerLog({
      schedulerConfig: schedulerConfig._id,
      startTime,
      endTime,
      affectedRows,
      message: error.message,
      success: false,
    });
    await log.save();
    // Handle transaction-specific errors
    if (error.name === 'MongoServerError' && error.code === 251) {
      console.log('Transient transaction error detected, consider retrying');
    }

    // Add monitoring integration here
    throw error;
  }
}

async function setupConfigWatcher() {
  const collection = SchedulerConfig.collection;
  const changeStream = collection.watch([], { fullDocument: 'updateLookup' });

  changeStream.on('change', async (change) => {
    if (change.operationType === 'update' || change.operationType === 'replace') {
      const config = change.fullDocument;
      console.log(`Config updated: ${config.name}`);
      await rescheduleSingleJob(config);
    }
  });

  changeStream.on('error', (error) => {
    console.error('Change stream error:', error);
  });
}

module.exports = {
  runSchedulerTask,
  setupConfigWatcher,
};
