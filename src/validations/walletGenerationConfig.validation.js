const Joi = require('joi');

const createConfig = {
  body: Joi.object({
    enabled: Joi.boolean().default(false),
    count: Joi.number().required(),
    derivation_path: Joi.string().required(),
    seedVersion: Joi.string().required(),
  }),
};

const updateConfig = {
  params: Joi.object({ id: Joi.string().required() }),
  body: Joi.object({
    enabled: Joi.boolean(),
    count: Joi.number(),
    derivation_path: Joi.string(),
    seedVersion: Joi.string(),
  }),
};

module.exports = {
  createConfig,
  updateConfig,
};
