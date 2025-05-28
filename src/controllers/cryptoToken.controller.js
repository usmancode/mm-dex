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

const deleteCryptoToken = async (req, res) => {
  const { id } = req.params;
  try {
    const deletedToken = await CryptoToken.findByIdAndDelete(id);
    if (!deletedToken) {
      return res.status(httpStatus.NOT_FOUND).send({ message: 'Token not found' });
    }
    return res.status(httpStatus.NO_CONTENT).send();
  } catch (error) {
    if (error.message === 'Cannot delete token as it is referenced in other collections') {
      return res.status(httpStatus.CONFLICT).send({
        message: error.message,
        references: error.references,
      });
    }
    throw error;
  }
};

module.exports = {
  createCryptoToken,
  getCryptoTokens,
  updateCryptoToken,
  deleteCryptoToken,
};
