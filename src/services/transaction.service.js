const Transaction = require('../models/transaction.model');
const mongoose = require('mongoose');

const transactionService = {
  async createTransaction({ walletId, amount, transactionHash, status, params, chainId, dex, message, txnType }) {
    const processedParams = Object.entries(params).reduce((acc, [key, value]) => {
      acc[key] = value?.toString ? value.toString() : value;
      return acc;
    }, {});

    return Transaction.create({
      wallet: walletId,
      amount: mongoose.Types.Decimal128.fromString(amount.toString()),
      transactionHash,
      status,
      params: processedParams,
      message,
      chainId,
      dex,
      txnType,
    });
  },

  async updateTransaction(transactionId, updateData) {
    return Transaction.findByIdAndUpdate(transactionId, { $set: updateData }, { new: true });
  },
};

module.exports = transactionService;
