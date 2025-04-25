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
      index: true,
    },
    token: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CryptoToken',
      required: false,
    },
    amount: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
      get: (v) => parseFloat(v.toString()),
    },
    transactionHash: {
      type: String,
      index: true,
      required: false,
      unique: true,
    },
    status: {
      type: String,
      enum: TxnStatus,
      default: TxnStatus.PENDING,
      index: true,
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
    poolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pool',
      required: false,
      index: true,
    },
    txnType: {
      type: String,
      enum: TxnTypes,
      required: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      getters: true,
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ wallet: 1, status: 1 });
transactionSchema.index({ transactionHash: 1, status: 1 });

transactionSchema.plugin(toJSON);
transactionSchema.plugin(paginate);

module.exports = mongoose.model('Transaction', transactionSchema);
