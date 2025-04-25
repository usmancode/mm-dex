const Joi = require('joi');

const createDistReturnConfig = {
  body: Joi.object().keys({
    network: Joi.string().required(),
    chainId: Joi.string().required(),
    nativeDistributionAmount: Joi.number().required(),
    tokenDistributionAmount: Joi.number().required(),
    minNativeDistributionAmount: Joi.number().required(),
    maxNativeDistributionAmount: Joi.number().required(),
    minTokenDistributionAmount: Joi.number().required(),
    maxTokenDistributionAmount: Joi.number().required(),
    expireAt: Joi.date().required(),
    tokenA: Joi.string().required(),
    tokenB: Joi.string().optional(),
  }),
};

const getDistReturnConfigs = {
  query: Joi.object().keys({
    sortBy: Joi.string().optional(),
    limit: Joi.number().optional(),
    page: Joi.number().optional(),
    enabled: Joi.boolean().optional(),
    configName: Joi.string().optional(),
  }),
};

const getDistReturnConfig = {
  params: Joi.object().keys({
    id: Joi.string().required(),
  }),
};

const updateDistReturnConfig = {
  params: Joi.object().keys({
    id: Joi.string().required(),
  }),
  body: Joi.object().min(1),
};

const deleteDistReturnConfig = {
  params: Joi.object().keys({
    id: Joi.string().required(),
  }),
};

module.exports = {
  createDistReturnConfig,
  getDistReturnConfigs,
  getDistReturnConfig,
  updateDistReturnConfig,
  deleteDistReturnConfig,
};
