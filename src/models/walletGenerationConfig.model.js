const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const walletGenerationConfigSchema = mongoose.Schema(
  {
    count: {
      type: Number,
      required: true,
      description: 'Number of wallet addresses to generate',
    },
    enabled: {
      type: Boolean,
      default: true,
      description: 'Whether wallet generation is enabled for this network',
    },
    derivation_path: {
      type: String,
      required: true,
      default: "m/44'/60'/0'/0",
      description: 'Base derivation path used to generate wallet addresses',
    },
    seedVersion: {
      type: String,
      required: true,
      default: 'v1',
      description: 'Version of the master seed used to generate wallets for this configuration',
    },
  },
  {
    timestamps: true,
  }
);

walletGenerationConfigSchema.plugin(toJSON);
walletGenerationConfigSchema.plugin(paginate);

const WalletGenerationConfig = mongoose.model('WalletGenerationConfig', walletGenerationConfigSchema);
module.exports = WalletGenerationConfig;
