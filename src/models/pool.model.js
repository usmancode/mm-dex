const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');
const ProtocolTypes = require('../enums/protocolTypes');

/**
 * Schema for storing DeFi liquidity pool information
 */
const decimalFields = ['minNativeForGas', 'tvlUsd'];
const poolSchema = mongoose.Schema(
  {
    poolAddress: {
      type: String,
      required: true,
      unique: true,
      description: 'On-chain address of the liquidity pool',
    },
    protocol: {
      type: String,
      required: true,
      enum: Object.values(ProtocolTypes),
      description: 'Protocol name (e.g., uniswap, quickswap)',
    },
    chainId: {
      type: Number,
      required: true,
      description: 'Chain ID where the pool resides',
    },
    token0: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CryptoToken',
      required: true,
      description: 'Reference to the first token in the pool',
    },
    token1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CryptoToken',
      required: true,
      description: 'Reference to the second token in the pool',
    },
    feeTier: {
      type: Number,
      required: true,
      description: 'Fee tier for the pool (e.g., 3000 for 0.3%)',
    },
    slippageTolerance: {
      type: Number,
      required: true,
      description: 'Slippage tolerance for trades involving this pool',
    },
    minNativeForGas: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
      description: 'Minimum native token required for gas (in wei)',
    },
    active: {
      type: Boolean,
      default: true,
      description: 'Indicates if the pool is actively monitored',
    },
    tvlUsd: {
      type: mongoose.Schema.Types.Decimal128,
      description: 'Total value locked in the pool (in USD)',
    },
    lastSynced: {
      type: Date,
      description: 'Timestamp of the last data sync for this pool',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      description: 'Additional metadata or stats about the pool',
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (doc, ret) => {
        decimalFields.forEach((field) => {
          if (ret[field] instanceof mongoose.Types.Decimal128) {
            ret[field] = parseFloat(ret[field].toString());
          }
        });
        return ret;
      },
    },
  }
);

// Add JSON transformation & pagination plugin
poolSchema.plugin(toJSON);
poolSchema.plugin(paginate);

const Pool = mongoose.model('Pool', poolSchema);
module.exports = Pool;
