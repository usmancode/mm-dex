const { name } = require('agenda/dist/agenda/name');
const Joi = require('joi');

const createPool = {
  body: Joi.object().keys({
    poolAddress: Joi.string().required(),
    protocol: Joi.string().required(),
    chainId: Joi.number().required(),
    token0: Joi.string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Should be valid ObjectId')
      .required(),
    token1: Joi.string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Should be valid ObjectId')
      .required(),
    feeTier: Joi.number().required(),
    slippageTolerance: Joi.number().required(),
    minNativeForGas: Joi.number().required(),
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
    token0: Joi.string().regex(/^[0-9a-fA-F]{24}$/, 'Should be valid ObjectId'),
    token1: Joi.string().regex(/^[0-9a-fA-F]{24}$/, 'Should be valid ObjectId'),
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
