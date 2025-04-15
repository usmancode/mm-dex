const httpStatus = require('http-status');
const CryptoToken = require('../models/cryptoToken.model');
const createCryptoToken = async (req, res) => {
  const cryptoToken = await CryptoToken.create(req.body);
  return res.status(httpStatus.CREATED).send(cryptoToken);
};

const getCryptoTokens = async (req, res) => {
  const cryptoTokens = await CryptoToken.paginate({}, { page: req.query.page || 1, limit: req.query.limit || 10 });
  return res.status(httpStatus.OK).send(cryptoTokens);
};

const updateCryptoToken = async (req, res) => {
  const { id } = req.params;
  const updatedToken = await CryptoToken.findByIdAndUpdate(id, req.body, { new: true });
  return res.status(httpStatus.OK).send(updatedToken);
};

module.exports = {
  createCryptoToken,
  getCryptoTokens,
  updateCryptoToken,
};
