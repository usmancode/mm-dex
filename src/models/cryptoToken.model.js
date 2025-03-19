const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const cryptoTokenSchema = mongoose.Schema(
  {
    tokenSymbol: {
      type: String,
      required: true,
      trim: true,
    },
    tokenAddress: {
      type: String,
      required: false, // not required for native tokens
      trim: true,
      default: null,
    },
    chainId: {
      type: String,
      required: true,
    },
    network: {
      type: String,
      required: true,
      trim: true,
    },
    isNative: {
      type: Boolean,
      default: false,
      description: 'True if this token is the native coin (e.g., ETH, MATIC)',
    },
    decimals: {
      type: Number,
      required: false,
      description: 'Number of decimals; not required for native tokens if unknown',
    },
    pairAddress: {
      type: String,
      default: null,
      description: 'Address of the trading pair contract',
    },
  },
  {
    timestamps: true,
  }
);

// Unique index on token_address and network combination (applies when token_address is set)
cryptoTokenSchema.index(
  { tokenAddress: 1, network: 1 },
  { unique: true, partialFilterExpression: { tokenAddress: { $exists: true } } }
);

cryptoTokenSchema.plugin(toJSON);
cryptoTokenSchema.plugin(paginate);

const CryptoToken = mongoose.model('CryptoToken', cryptoTokenSchema);
module.exports = CryptoToken;
