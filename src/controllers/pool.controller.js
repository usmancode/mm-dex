const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const poolService = require('../services/pool.service');
const CryptoToken = require('../models/cryptoToken.model');

const createPool = async (req, res, next) => {
  try {
    const token0 = req.body.token0;
    const token1 = req.body.token1;
    console.log('Creating pool with data:', req.body);
    if (token0 === token1) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Token0 and Token1 cannot be the same');
    }
    await Promise.all([verifyCryptoToken(token1), verifyCryptoToken(token1)]);
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
    //check if token0 and token1 are valid crypto tokens
    if (req.body.token0) {
      await verifyCryptoToken(req.body.token0);
    }
    if (req.body.token1) {
      await verifyCryptoToken(req.body.token1);
    }
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
    if (error.message === 'Cannot delete pool as it is referenced in other collections') {
      return res.status(httpStatus.CONFLICT).send({
        message: error.message,
        references: error.references,
      });
    }
    next(error);
  }
};

const verifyCryptoToken = async (token) => {
  const tokenFound = await CryptoToken.findById(token);
  if (!tokenFound) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Token not found');
  }

  return true;
};

module.exports = {
  createPool,
  getPools,
  getPool,
  updatePool,
  deletePool,
};
