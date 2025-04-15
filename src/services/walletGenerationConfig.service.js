const { WalletGenerationConfig } = require('../models');

const createConfig = async (payload) => {
  return WalletGenerationConfig.create(payload);
};

const queryConfigs = async (filter, options) => {
  return WalletGenerationConfig.paginate(filter, options);
};

const updateConfigById = async (id, updateBody) => {
  return WalletGenerationConfig.findByIdAndUpdate(id, updateBody, { new: true });
};

module.exports = {
  createConfig,
  queryConfigs,
  updateConfigById,
};
