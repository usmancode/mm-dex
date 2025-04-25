const transactionService = require('../services/transaction.service');
const Wallet = require('../models/wallet.model');
const mongoose = require('mongoose');
const catchAsync = require('../utils/catchAsync');

const getTransactions = catchAsync(async (req, res) => {
  const filter = {};
  const query = req.query;

  // Existing filters
  if (query.id) {
    if (mongoose.Types.ObjectId.isValid(query.id)) {
      filter._id = query.id;
    } else {
      return res.status(400).json({ error: 'Invalid transaction ID' });
    }
  }
  if (query.transactionHash) filter.transactionHash = query.transactionHash;
  if (query.status) filter.status = query.status;
  if (query.txnType) filter.txnType = query.txnType;

  // New wallet address filter
  if (query.walletAddress) {
    const wallet = await Wallet.findOne({ address: query.walletAddress });
    if (!wallet) {
      return res.status(400).json({ error: 'Wallet not found' });
    }
    filter.wallet = wallet._id;
  }

  // Sorting and pagination
  const options = {
    sortBy: query.sortBy || 'createdAt:desc',
    limit: parseInt(query.limit, 10) || 10,
    page: parseInt(query.page, 10) || 1,
  };

  const result = await transactionService.queryTransactions(filter, options);
  res.send(result);
});

module.exports = {
  getTransactions,
};
