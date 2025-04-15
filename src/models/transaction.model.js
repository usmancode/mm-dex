const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');
const TxnStatus = require('../enums/txnStatus');
const TxnTypes = require('../enums/txnTypes');

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
      enum: TxnStatus,
      default: TxnStatus.PENDING,
    },
    params: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    message: {
      type: String,
      required: false,
    },
    chainId: {
      type: String,
      required: false,
    },
    dex: {
      type: String,
      required: false,
    },
    txnType: {
      type: String,
      enum: TxnTypes,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

transactionSchema.plugin(toJSON);
transactionSchema.plugin(paginate);

module.exports = mongoose.model('Transaction', transactionSchema);
