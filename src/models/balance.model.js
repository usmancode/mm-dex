const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const balanceSchema = mongoose.Schema(
  {
    wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true,
    },
    token: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CryptoToken',
      required: true,
    },
    balance: {
      type: mongoose.Schema.Types.Decimal128,
      default: 0,
    },
    snapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      description:
        'Embedded snapshot of related data: { wallet: { address, hd_index, is_master }, walletGenerationConfig: { network, derivation_path, seedVersions }, cryptoToken: { token_symbol, token_address, chainId, isNative, decimals } }',
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
  }
);

// Apply plugins
balanceSchema.plugin(toJSON);
balanceSchema.plugin(paginate);

// Each wallet should have only one balance entry per token.
balanceSchema.index({ wallet: 1, token: 1 }, { unique: true });

// Additional index to speed up queries that filter by token.
balanceSchema.index({ token: 1 });

module.exports = mongoose.model('Balance', balanceSchema);
