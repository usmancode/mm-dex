const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');
const Balance = require('./balance.model');
const DistReturnConfig = require('./distReturnConfig.model');
const Pool = require('./pool.model');
const Transaction = require('./transaction.model');

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

// Pre-remove middleware to check for references
cryptoTokenSchema.pre('remove', async function (next) {
  const tokenId = this._id;

  try {
    // Check for references in other collections
    const [balanceRefs, distReturnConfigRefs, poolRefs, transactionRefs] = await Promise.all([
      Balance.findOne({ token: tokenId }),
      DistReturnConfig.findOne({ $or: [{ token0: tokenId }, { token1: tokenId }] }),
      Pool.findOne({ $or: [{ token0: tokenId }, { token1: tokenId }] }),
      Transaction.findOne({ token: tokenId }),
    ]);

    if (balanceRefs || distReturnConfigRefs || poolRefs || transactionRefs) {
      const error = new Error('Cannot delete token as it is referenced in other collections');
      error.references = {
        hasBalanceReferences: !!balanceRefs,
        hasDistReturnConfigReferences: !!distReturnConfigRefs,
        hasPoolReferences: !!poolRefs,
        hasTransactionReferences: !!transactionRefs,
      };
      return next(error);
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Also add pre-findOneAndDelete middleware for findOneAndDelete operations
cryptoTokenSchema.pre('findOneAndDelete', async function (next) {
  const tokenId = this.getQuery()._id;

  try {
    // Check for references in other collections
    const [balanceRefs, distReturnConfigRefs, poolRefs, transactionRefs] = await Promise.all([
      Balance.findOne({ token: tokenId }),
      DistReturnConfig.findOne({ $or: [{ token0: tokenId }, { token1: tokenId }] }),
      Pool.findOne({ $or: [{ token0: tokenId }, { token1: tokenId }] }),
      Transaction.findOne({ token: tokenId }),
    ]);

    if (balanceRefs || distReturnConfigRefs || poolRefs || transactionRefs) {
      const error = new Error('Cannot delete token as it is referenced in other collections');
      error.references = {
        hasBalanceReferences: !!balanceRefs,
        hasDistReturnConfigReferences: !!distReturnConfigRefs,
        hasPoolReferences: !!poolRefs,
        hasTransactionReferences: !!transactionRefs,
      };
      return next(error);
    }

    next();
  } catch (error) {
    next(error);
  }
});

cryptoTokenSchema.plugin(toJSON);
cryptoTokenSchema.plugin(paginate);

const CryptoToken = mongoose.model('CryptoToken', cryptoTokenSchema);
module.exports = CryptoToken;
