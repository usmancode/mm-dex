const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const distReturnConfigService = require('../services/distReturnConfig.service');
const pick = require('../utils/pick');

const createDistReturnConfig = catchAsync(async (req, res) => {
  const distReturnConfig = await distReturnConfigService.createDistReturnConfig(req.body);
  return res.status(httpStatus.CREATED).send(distReturnConfig);
});

const getDistReturnConfigs = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'enabled']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  const distReturnConfigs = await distReturnConfigService.queryDistReturnConfigs(filter, options);
  return res.send(distReturnConfigs);
});

const getDistReturnConfig = catchAsync(async (req, res) => {
  const distReturnConfig = await distReturnConfigService.getDistReturnConfigById(req.params.id);
  if (!distReturnConfig) {
    return res.status(httpStatus.NOT_FOUND).send({ message: 'DistReturnConfig not found' });
  }
  return res.send(distReturnConfig);
});

const updateDistReturnConfig = catchAsync(async (req, res) => {
  const distReturnConfig = await distReturnConfigService.updateDistReturnConfigById(req.params.id, req.body);
  if (!distReturnConfig) {
    return res.status(httpStatus.NOT_FOUND).send({ message: 'DistReturnConfig not found' });
  }
  return res.send(distReturnConfig);
});

const deleteDistReturnConfig = catchAsync(async (req, res) => {
  const distReturnConfig = await distReturnConfigService.deleteDistReturnConfigById(req.params.id);
  if (!distReturnConfig) {
    return res.status(httpStatus.NOT_FOUND).send({ message: 'DistReturnConfig not found' });
  }
  return res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createDistReturnConfig,
  getDistReturnConfigs,
  getDistReturnConfig,
  updateDistReturnConfig,
  deleteDistReturnConfig,
};
