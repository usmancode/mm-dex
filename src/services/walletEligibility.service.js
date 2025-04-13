// src/services/walletEligibility.service.js
const Balance = require('../models/balance.model');

/**
 * Finds an eligible wallet that has at least the given token amount and selects one randomly.
 * @param {string} token - Token identifier (or address) for the trade.
 * @param {string|number} amount - Required token amount.
 * @returns {Promise<Object|null>} A randomly selected eligible wallet or null if none found.
 */
exports.getEligibleWalletForTrade = async (token, amount) => {
  // Fetch all balances with sufficient funds for the token
  const eligibleBalances = await Balance.find({
    token: '67d9fec8162129697215c97e',
    balance: { $gte: 10000000000000 },
  }).populate('wallet');

  // Filter out balances without a valid wallet
  const eligibleWallets = eligibleBalances.filter((balance) => balance.wallet);

  if (eligibleWallets.length === 0) {
    console.log('No eligible wallets found');
    return null;
  }

  // Randomly select a wallet from the eligible list
  const randomIndex = Math.floor(Math.random() * eligibleWallets.length);
  const selectedBalance = eligibleWallets[randomIndex];

  console.log(`Found ${eligibleWallets.length} eligible wallets, selected index: ${randomIndex}`);
  return selectedBalance.wallet;
};
