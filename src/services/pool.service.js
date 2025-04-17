const Pool = require('../models/pool.model');

const createPool = async (payload) => {
  return Pool.create(payload);
};

const queryPools = async (filter = {}, options = {}) => {
  return Pool.paginate(filter, options);
};

const getPoolById = async (poolId) => {
  return Pool.findById(poolId);
};

const updatePoolById = async (poolId, updateBody) => {
  return Pool.findByIdAndUpdate(poolId, updateBody, { new: true });
};

const deletePoolById = async (poolId) => {
  return Pool.findByIdAndDelete(poolId);
};

module.exports = {
  createPool,
  queryPools,
  getPoolById,
  updatePoolById,
  deletePoolById,
};
