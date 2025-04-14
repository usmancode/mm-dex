const Balance = require('../models/balance.model');
const { ethers } = require('ethers');

/**
 * Finds an eligible wallet that has at least the given token amount and selects one randomly.
 * @param {string} token - Token identifier (or address) for the trade.
 * @param {string|number} amount - Required token amount.
 * @returns {Promise<Object|null>} A randomly selected eligible wallet or null if none found.
 */
exports.getEligibleWalletForTrade = async (token, amount, decimals) => {
  const amountInWei = ethers.parseUnits(amount, decimals);
  const eligibleBalances = await Balance.find({
    token: token,
    balance: { $gte: amountInWei.toString() },
  }).populate('wallet');
  const eligibleWallets = eligibleBalances.filter((balance) => balance.wallet);
  if (eligibleWallets.length === 0) {
    console.log('No eligible wallets found');
    return null;
  }
  const randomIndex = Math.floor(Math.random() * eligibleWallets.length);
  const selectedBalance = eligibleWallets[randomIndex];
  console.log(`Found ${eligibleWallets.length} eligible wallets, selected index: ${randomIndex}`);
  return selectedBalance.wallet;
};
