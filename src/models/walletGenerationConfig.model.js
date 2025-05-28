const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');
const Wallet = require('./wallet.model');

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

// Pre-remove middleware to check for references
walletGenerationConfigSchema.pre('remove', async function (next) {
  const configId = this._id;

  try {
    // Check for references in other collections
    const walletRefs = await Wallet.findOne({ walletGenerationConfig: configId });

    if (walletRefs) {
      const error = new Error('Cannot delete wallet generation config as it is referenced in other collections');
      error.references = {
        hasWalletReferences: true,
      };
      return next(error);
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Also add pre-findOneAndDelete middleware for findOneAndDelete operations
walletGenerationConfigSchema.pre('findOneAndDelete', async function (next) {
  const configId = this.getQuery()._id;

  try {
    // Check for references in other collections
    const walletRefs = await Wallet.findOne({ walletGenerationConfig: configId });

    if (walletRefs) {
      const error = new Error('Cannot delete wallet generation config as it is referenced in other collections');
      error.references = {
        hasWalletReferences: true,
      };
      return next(error);
    }

    next();
  } catch (error) {
    next(error);
  }
});

walletGenerationConfigSchema.plugin(toJSON);
walletGenerationConfigSchema.plugin(paginate);

const WalletGenerationConfig = mongoose.model('WalletGenerationConfig', walletGenerationConfigSchema);
module.exports = WalletGenerationConfig;
