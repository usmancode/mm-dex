const SchedulerConfig = require('../models/schedulerConfig.model');
const cronValidator = require('cron-validator');
const ApiError = require('../utils/ApiError');
const { agenda } = require('../scheduler/agenda'); // Adjust the path as necessary
const httpStatus = require('http-status');

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

const createSchedulerConfig = async (payload) => {
  return SchedulerConfig.create(payload);
};

const querySchedulerConfigs = async (filter, options) => {
  return SchedulerConfig.paginate(filter, options);
};

const getSchedulerConfigById = async (id) => {
  return SchedulerConfig.findById(id);
};

const updateSchedulerConfigById = async (id, updateBody, triggerNow = false) => {
  // Validate cron expression
  if (updateBody.cronExpression && !cronValidator.isValidCron(updateBody.cronExpression)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid cron expression');
  }

  const updatedConfig = await SchedulerConfig.findByIdAndUpdate(id, updateBody, { new: true, runValidators: true });

  if (!updatedConfig) return null;

  try {
    const jobConfig = JOB_CONFIGURATION[updatedConfig.name];
    if (!jobConfig) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid scheduler name');
    }

    // Cancel using agenda instance
    await agenda.cancel({ 'data.name': updatedConfig.name });

    if (updatedConfig.enabled) {
      await agenda.every(
        updatedConfig.cronExpression,
        jobConfig.agendaName,
        { name: updatedConfig.name } // Store name in job data
      );

      if (triggerNow) {
        await agenda.now(jobConfig.agendaName);
      }
    }

    return updatedConfig;
  } catch (error) {
    console.error(`Rescheduling error: ${error.message}`);
    // Rollback config update
    await SchedulerConfig.findByIdAndUpdate(id, { enabled: false });
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to update scheduler: ' + error.message);
  }
};

const deleteSchedulerConfigById = async (id) => {
  return SchedulerConfig.findByIdAndDelete(id);
};

module.exports = {
  createSchedulerConfig,
  querySchedulerConfigs,
  getSchedulerConfigById,
  updateSchedulerConfigById,
  deleteSchedulerConfigById,
};
