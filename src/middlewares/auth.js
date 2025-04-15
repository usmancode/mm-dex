const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const config = require('../config/config'); // Import config for API key

const apiKeyAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey && apiKey === config.apiKey) {
    return next();
  }
  return next(new ApiError(httpStatus.FORBIDDEN, 'Forbidden: Invalid API Key'));
};

module.exports = { apiKeyAuth };
