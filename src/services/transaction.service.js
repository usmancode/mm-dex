const Transaction = require('../models/transaction.model');
const mongoose = require('mongoose');

const transactionService = {
  async queryTransactions(filter, options) {
    const populateString = ['wallet', 'poolId'].join(',');

    const result = await Transaction.paginate(filter, {
      ...options,
      populate: populateString,
    });

    const transformedResults = result.results.map((doc) => {
      const jsonDoc = doc.toJSON();

      if (jsonDoc.wallet) {
        jsonDoc.wallet = {
          id: jsonDoc.wallet.id,
          address: jsonDoc.wallet.address,
          type: jsonDoc.wallet.type,
          status: jsonDoc.wallet.status,
        };
      }

      if (jsonDoc.poolId) {
        jsonDoc.poolId = {
          id: jsonDoc.poolId.id,
          protocol: jsonDoc.poolId.protocol,
          chainId: jsonDoc.poolId.chainId,
          poolAddress: jsonDoc.poolId.poolAddress,
        };
      }

      return jsonDoc;
    });

    return {
      ...result,
      results: transformedResults,
    };
  },

  async createTransaction({ walletId, amount, transactionHash, status, params, chainId, message, txnType, poolId }) {
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
      poolId,
      txnType,
    });
  },

  async updateTransaction(transactionId, updateData) {
    return Transaction.findByIdAndUpdate(transactionId, { $set: updateData }, { new: true });
  },
};

module.exports = transactionService;
