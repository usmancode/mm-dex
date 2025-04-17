const Joi = require('joi');

const createPool = {
  body: Joi.object().keys({
    poolAddress: Joi.string().required(),
    protocol: Joi.string().required(),
    chainId: Joi.number().required(),
    token0: Joi.string().required(),
    token1: Joi.string().required(),
    feeTier: Joi.number().required(),
    slippageTolerance: Joi.number().required(),
    minNativeForGas: Joi.number().required(),
    active: Joi.boolean().default(false),
    tvlUsd: Joi.number(),
  }),
};

const getPool = {
  params: Joi.object().keys({
    poolId: Joi.string().required(),
  }),
};

const updatePool = {
  params: Joi.object().keys({
    poolId: Joi.string().required(),
  }),
  body: Joi.object().keys({
    poolAddress: Joi.string(),
    protocol: Joi.string(),
    chainId: Joi.number(),
    token0: Joi.string(),
    token1: Joi.string(),
    feeTier: Joi.number(),
    slippageTolerance: Joi.number(),
    minNativeForGas: Joi.number(),
    active: Joi.boolean(),
    tvlUsd: Joi.number(),
  }),
};

const deletePool = {
  params: Joi.object().keys({
    poolId: Joi.string().required(),
  }),
};

module.exports = {
  createPool,
  getPool,
  updatePool,
  deletePool,
};
