const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const walletUsageSchema = new mongoose.Schema(
  {
    wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    hd_index: {
      type: Number,
      required: true,
    },
    chainId: {
      type: String,
      required: true,
    },
    tokenAddress: {
      type: String,
      default: null,
    },
    buyWeight: {
      type: Number,
      default: 0,
    },
    sellWeight: {
      type: Number,
      default: 0,
    },
    volume: {
      type: Number,
      default: 0,
    },
    lastTradeTime: {
      type: Date,
      default: null,
    },
    pool: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pool',
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// If you often filter by `wallet` or need to join on it:
walletUsageSchema.index({ wallet: 1 });

// If you often filter by chainId + tokenAddress + address:
walletUsageSchema.index({ chainId: 1, tokenAddress: 1, address: 1 });

// If you often query or sort by buyWeight/sellWeight/volume
// under the same chainId and tokenAddress, you can use a compound index:
walletUsageSchema.index({
  chainId: 1,
  tokenAddress: 1,
  buyWeight: 1,
  sellWeight: 1,
  volume: 1,
});

// If you frequently sort or filter by lastTradeTime:
walletUsageSchema.index({ lastTradeTime: 1 });

walletUsageSchema.plugin(toJSON);
walletUsageSchema.plugin(paginate);

module.exports = mongoose.model('WalletUsage', walletUsageSchema);
