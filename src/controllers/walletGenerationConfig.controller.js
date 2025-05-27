const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const walletGenConfigService = require('../services/walletGenerationConfig.service');

const createConfig = catchAsync(async (req, res) => {
  const config = await walletGenConfigService.createConfig(req.body);
  res.status(httpStatus.CREATED).send(config);
});

const listConfigs = catchAsync(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const options = { page, limit };
  const result = await walletGenConfigService.queryConfigs({}, options);
  res.send(result);
});

const updateConfig = catchAsync(async (req, res) => {
  const config = await walletGenConfigService.updateConfigById(req.params.id, req.body);
  res.send(config);
});

const deleteConfig = catchAsync(async (req, res) => {
  await walletGenConfigService.deleteConfigById(req.params.id);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createConfig,
  listConfigs,
  updateConfig,
  deleteConfig,
};
