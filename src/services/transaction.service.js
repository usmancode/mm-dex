const Transaction = require('../models/transaction.model');
const mongoose = require('mongoose');

const transactionService = {
  /**
   * Create a new transaction record
   */
  async createTransaction({ walletId, amount, transactionHash, status, params, chainId, dex, message, txnType }) {
    // Convert BigNumber parameters to strings
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

  /**
   * Update transaction status and parameters
   */
  async updateTransaction(transactionId, updateData) {
    return Transaction.findByIdAndUpdate(transactionId, { $set: updateData }, { new: true });
  },
};

module.exports = transactionService;
