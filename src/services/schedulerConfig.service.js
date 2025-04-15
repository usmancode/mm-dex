const SchedulerConfig = require('../models/schedulerConfig.model');

const createSchedulerConfig = async (payload) => {
  return SchedulerConfig.create(payload);
};

const querySchedulerConfigs = async (filter, options) => {
  return SchedulerConfig.paginate(filter, options);
};

const getSchedulerConfigById = async (id) => {
  return SchedulerConfig.findById(id);
};

const updateSchedulerConfigById = async (id, updateBody) => {
  return SchedulerConfig.findByIdAndUpdate(id, updateBody, { new: true });
};

const deleteSchedulerConfigById = async (id) => {
  return SchedulerConfig.findByIdAndDelete(id);
};

module.exports = {
  createSchedulerConfig,
  querySchedulerConfigs,
  getSchedulerConfigById,
  updateSchedulerConfigById,
  deleteSchedulerConfigById,
};
