const { DistReturnConfig } = require('../models');
const createDistReturnConfig = async (payload) => {
  return DistReturnConfig.create(payload);
};

const queryDistReturnConfigs = async (filter, options) => {
  const result = await DistReturnConfig.paginate(filter, options);
  return result;
};

const getDistReturnConfigById = async (id) => {
  return DistReturnConfig.findById(id);
};

const updateDistReturnConfigById = async (id, updateBody) => {
  const distReturnConfig = await DistReturnConfig.findByIdAndUpdate(id, updateBody, { new: true });
  return distReturnConfig;
};

const deleteDistReturnConfigById = async (id) => {
  const distReturnConfig = await DistReturnConfig.findByIdAndDelete(id);
  return distReturnConfig;
};

module.exports = {
  createDistReturnConfig,
  queryDistReturnConfigs,
  getDistReturnConfigById,
  updateDistReturnConfigById,
  deleteDistReturnConfigById,
};
