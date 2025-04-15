const Joi = require('joi');

const createConfig = {
  body: Joi.object({
    chainId: Joi.number().required(),
    enabled: Joi.boolean().default(false),
    count: Joi.number().required(),
    derivation_path: Joi.string().required(),
    seedVersion: Joi.string().required(),
  }),
};

const updateConfig = {
  params: Joi.object({ id: Joi.string().required() }),
  body: Joi.object({
    chainId: Joi.number(),
    enabled: Joi.boolean(),
    count: Joi.number(),
  }),
};

module.exports = {
  createConfig,
  updateConfig,
};
