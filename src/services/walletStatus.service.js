const Wallet = require('../models/wallet.model');
const WalletUsage = require('../models/walletUsage.model');
const WalletTypes = require('../enums/walletTypes');

/**
 * Activate a certain number of wallets for trading.
 *
 * @param {number} limit - The total number of active wallets desired.
 * @param {string|number} chainId - The chain ID.
 * @param {string} tokenAddress - The token contract address.
 * @param {string} pairAddress - The pair (e.g., LP) address.
 * @param {object} [session] - (Optional) A Mongoose session object, if we want a DB transaction.
 *
 * @returns {Array|null} The list of activated wallet documents, or null if none were activated.
 */
async function activateWalletsForTrading(limit, chainId, tokenAddress, pairAddress, session) {
  // CHANGED: added session param
  // Count existing usage
  let usageQuery = WalletUsage.countDocuments({ tokenAddress, pairAddress });
  if (session) usageQuery = usageQuery.session(session); // CHANGED

  const existingCount = await usageQuery;
  if (existingCount >= limit) {
    console.log('Sufficient active wallets. Skipping activation.');
    return null;
  }

  const needed = limit - existingCount;

  // Random sample of needed inactive wallets
  let walletAgg = Wallet.aggregate([
    { $match: { type: WalletTypes.NORMAL, status: 'inactive' } },
    { $sample: { size: needed } },
  ]);
  if (session) walletAgg = walletAgg.session(session); // CHANGED

  const walletsToActivate = await walletAgg;
  if (walletsToActivate.length === 0) {
    throw new Error('No inactive wallets available');
  }

  const walletIds = walletsToActivate.map((w) => w._id);

  // Update them to active
  if (session) {
    await Wallet.updateMany({ _id: { $in: walletIds } }, { status: 'active' }, { session });
  } else {
    await Wallet.updateMany({ _id: { $in: walletIds } }, { status: 'active' });
  }

  // Create usage records
  await addToWalletUsage(walletsToActivate, chainId, tokenAddress, pairAddress, session);

  // Return the newly activated docs
  let findQuery = Wallet.find({ _id: { $in: walletIds } });
  if (session) findQuery = findQuery.session(session); // CHANGED
  return await findQuery;
}

async function addToWalletUsage(wallets, chainId, tokenAddress, pairAddress, session) {
  const walletIds = wallets.map((w) => w._id);

  let usageFind = WalletUsage.find({
    wallet: { $in: walletIds },
    tokenAddress,
    pairAddress,
  });
  if (session) usageFind = usageFind.session(session); // CHANGED
  const existing = await usageFind;

  const existingSet = new Set(existing.map((doc) => doc.wallet.toString()));
  const newDocs = wallets
    .filter((w) => !existingSet.has(w._id.toString()))
    .map((w) => ({
      wallet: w._id,
      chainId,
      tokenAddress,
      pairAddress,
      hd_index: w.hd_index,
      address: w.address,
    }));

  if (newDocs.length > 0) {
    if (session) {
      await WalletUsage.insertMany(newDocs, { session });
    } else {
      await WalletUsage.insertMany(newDocs);
    }
  }
}

/**
 * Selects an active pool of wallets based on usage stats.
 *
 * Criteria:
 * - is_master is false.
 * - Matches the given chainId and tokenAddress.
 * - Has either never traded (lastTradeTime is null) or hasn't traded in the last 24 hours.
 * - Sorted by ascending weight, then volume, then lastTradeTime.
 *
 * @param {Object} options
 *   - chainId {Number} The chain id to match.
 *   - tokenAddress {String} The token address to match (or null for native).
 *   - limit {Number} Maximum number of wallets to select (default 1000).
 * @returns {Promise<Array>} Array of WalletUsage documents.
 */
async function pickActivePool(options) {
  const { chainId, tokenAddress, limit = 1000 } = options;
  // Define a default threshold – for example, 24 hours ago.
  const lastTradeThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const query = {
    type: WalletTypes.NORMAL,
    chainId: chainId,
    tokenAddress: tokenAddress,
    $or: [{ lastTradeTime: { $lt: lastTradeThreshold } }, { lastTradeTime: null }],
  };

  const activePool = await WalletUsage.find(query).sort({ weight: 1, volume: 1, lastTradeTime: 1 }).limit(limit);

  return activePool;
}

/**
 * Picks active wallets for trading.
 * It returns wallets with status 'active', sorted by weight.
 *
 * @param {number} limit - The number of wallets to retrieve.
 * @returns {Promise<Array>} - The list of active wallet documents.
 */
async function pickWalletsForTrading(options) {
  const { limit = 1000, chainId, tokenAddress, pairAddress } = options;
  const query = {};
  if (tokenAddress) {
    query.tokenAddress = tokenAddress;
  }
  if (pairAddress) {
    query.pairAddress = pairAddress;
  }
  query.chainId = chainId.toString();
  const usageDocs = await WalletUsage.find(query)
    .sort({ buyWeight: 1, sellWeight: 1, volume: 1, lastTradeTime: 1 })
    .limit(limit)
    .lean();
  console.log(`${usageDocs.length} wallets selected for trading based on usage stats.`);
  return usageDocs;
}
/**
 * Deactivates all active wallets (resets status back to 'inactive').
 * This function should be called after the trading session to pull funds back.
 *
 * @returns {Promise<void>}
 */
async function deactivateActiveWallets() {
  const result = await Wallet.updateMany({ type: WalletTypes.NORMAL, status: 'active' }, { status: 'inactive' });
  console.log(`Deactivated ${result.modifiedCount} active wallets.`);
}

module.exports = {
  activateWalletsForTrading,
  pickWalletsForTrading,
  deactivateActiveWallets,
};
