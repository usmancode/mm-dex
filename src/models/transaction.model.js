const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const transactionSchema = mongoose.Schema(
  {
    wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true,
    },
    token: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CryptoToken',
      required: false,
    },
    amount: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
    },
    transactionHash: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

transactionSchema.plugin(toJSON);
transactionSchema.plugin(paginate);

module.exports = mongoose.model('Transaction', transactionSchema);
