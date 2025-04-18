const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const schedulerConfigService = require('../services/schedulerConfig.service');

const createSchedulerConfig = catchAsync(async (req, res) => {
  const schedulerConfig = await schedulerConfigService.createSchedulerConfig(req.body);
  res.status(httpStatus.CREATED).send(schedulerConfig);
});

const getSchedulerConfigs = catchAsync(async (req, res) => {
  const filter = {}; // or build from req.query
  const options = { limit: parseInt(req.query.limit, 10) || 10, page: parseInt(req.query.page, 10) || 1 };
  const result = await schedulerConfigService.querySchedulerConfigs(filter, options);
  res.send(result);
});

const updateSchedulerConfig = catchAsync(async (req, res) => {
  const { triggerNow } = req.query;
  const schedulerConfig = await schedulerConfigService.updateSchedulerConfigById(
    req.params.schedulerConfigId,
    req.body,
    triggerNow === 'true'
  );

  if (!schedulerConfig) {
    throw new ApiError(httpStatus.NOT_FOUND, 'SchedulerConfig not found');
  }
  res.send(schedulerConfig);
});

module.exports = {
  createSchedulerConfig,
  getSchedulerConfigs,
  updateSchedulerConfig,
};
