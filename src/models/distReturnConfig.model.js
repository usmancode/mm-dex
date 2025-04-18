const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const distReturnConfigSchema = mongoose.Schema(
  {
    nativeDistributionAmount: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
      description: 'Total native funds (e.g., ETH) allocated for distribution',
    },
    tokenDistributionAmount: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
      description: 'Total token funds allocated for distribution',
    },
    minNativeDistributionAmount: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
      description: 'Minimum native amount to transfer per wallet',
    },
    maxNativeDistributionAmount: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
      description: 'Maximum native amount to transfer per wallet',
    },
    minTokenDistributionAmount: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
      description: 'Minimum token amount to transfer per wallet',
    },
    maxTokenDistributionAmount: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
      description: 'Maximum token amount to transfer per wallet',
    },
    enabled: {
      type: Boolean,
      default: false,
      description: 'Whether distribution is currently enabled',
    },
    activePoolSize: {
      type: Number,
      default: 100,
      description: 'Number of wallets in the active pool for distribution',
    },
    chainId: {
      type: String,
      required: true,
      description: 'Blockchain chain ID',
    },
    expireAt: {
      type: Date,
      required: true,
      description: 'Distribution configuration expiration date and time',
    },
    tokenA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CryptoToken',
      required: true,
      description: 'Reference to the Token A configuration',
    },
    tokenB: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CryptoToken',
      required: false,
      default: null,
      description: 'Reference to the Token B configuration (optional)',
    },
    network: {
      type: String,
      required: true,
      description: 'Name of the network (e.g., ETHEREUM, BSC)',
    },
    returnEnabled: {
      type: Boolean,
      default: false,
      description: 'Whether returning of funds is currently enabled',
    },
    returnAfter: {
      type: Date,
      default: function () {
        return new Date(Date.now() + 24 * 60 * 60 * 1000);
      },
      description: 'Date/time after which funds can be returned to master wallet',
    },
    maxNativeLeftOver: {
      type: mongoose.Schema.Types.Decimal128,
      default: '0',
      description: 'How much native leftover is allowed in the wallet after distribution/return',
    },
    maxTokenLeftOver: {
      type: mongoose.Schema.Types.Decimal128,
      default: '0',
      description: 'How much token leftover is allowed in the wallet after distribution/return',
    },
    masterWallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet',
      required: false,
      description: 'Reference to the wallet doc to use as the master wallet for distribution/returns',
    },
  },
  {
    timestamps: true,
  }
);

// Optimized Indexes
distReturnConfigSchema.index({ network: 1, chainId: 1 });
distReturnConfigSchema.index({ enabled: 1 });
distReturnConfigSchema.index({ expireAt: 1 });
distReturnConfigSchema.index({ tokenA: 1 });
distReturnConfigSchema.index({ tokenA: 1, tokenB: 1 });

distReturnConfigSchema.plugin(toJSON);
distReturnConfigSchema.plugin(paginate);

module.exports = mongoose.model('DistReturnConfig', distReturnConfigSchema);
