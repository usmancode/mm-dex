const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const poolService = require('../services/pool.service');

const createPool = async (req, res, next) => {
  try {
    const pool = await poolService.createPool(req.body);
    res.status(httpStatus.CREATED).send(pool);
  } catch (error) {
    next(error);
  }
};

const getPools = async (req, res, next) => {
  try {
    const filter = {};
    const options = {
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 10,
      sortBy: req.query.sortBy || 'createdAt:desc',
    };
    const result = await poolService.queryPools(filter, options);
    res.send(result);
  } catch (error) {
    next(error);
  }
};

const getPool = async (req, res, next) => {
  try {
    const pool = await poolService.getPoolById(req.params.poolId);
    if (!pool) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Pool not found');
    }
    res.send(pool);
  } catch (error) {
    next(error);
  }
};

const updatePool = async (req, res, next) => {
  try {
    const pool = await poolService.updatePoolById(req.params.poolId, req.body);
    if (!pool) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Pool not found');
    }
    res.send(pool);
  } catch (error) {
    next(error);
  }
};

const deletePool = async (req, res, next) => {
  try {
    const pool = await poolService.deletePoolById(req.params.poolId);
    if (!pool) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Pool not found');
    }
    res.status(httpStatus.NO_CONTENT).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPool,
  getPools,
  getPool,
  updatePool,
  deletePool,
};
