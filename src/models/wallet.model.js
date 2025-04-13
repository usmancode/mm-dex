const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');
const WalletTypes = require('../enums/walletTypes');
const walletSchema = mongoose.Schema(
  {
    address: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    hd_index: {
      type: Number,
      required: true,
    },
    aggregateBuyWeight: {
      type: Number,
      default: 0,
    },
    aggregateSellWeight: {
      type: Number,
      default: 0,
    },
    aggregateVolume: {
      type: Number,
      default: 0,
    },
    type: {
      type: String,
      enum: Object.values(WalletTypes),
      default: WalletTypes.NORMAL,
      description: 'Type of wallet (e.g., normal, master)',
    },
    walletGenerationConfig: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WalletGenerationConfig',
      required: true,
      description: 'Reference to the wallet generation configuration used for this wallet',
    },
    snapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      description: 'Embedded snapshot of wallet generation configuration details (network, derivation_path, seedVersion)',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'archived'],
      default: 'inactive',
      description: 'Status of the wallet, used to determine if it is in the active pool for trading',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
walletSchema.index({ address: 1 }); // Unique address index
walletSchema.index({ hd_index: 1 });

// Compound index for queries filtering by status and sorting by aggregate metrics
walletSchema.index({ status: 1, aggregateBuyWeight: -1, aggregateSellWeight: -1, aggregateVolume: -1 });

// Index to quickly retrieve master wallets
walletSchema.index({ type: 1 });

// If you often query by walletGenerationConfig, index that as well
walletSchema.index({ walletGenerationConfig: 1 });

walletSchema.plugin(toJSON);
walletSchema.plugin(paginate);

module.exports = mongoose.model('Wallet', walletSchema);
