const { ethers } = require('ethers');
const { tradeQueue } = require('../queues/trade.queue');
const { getEligibleWalletForTrade } = require('./walletEligibility.service');
const protocolAdapters = require('../adapters/protocolAdapters'); // Exports mapping of adapters
const { getHDWallet } = require('./walletService');
const WalletGenerationConfig = require('../models/walletGenerationConfig.model');
const config = require('../config/config');
const balanceModel = require('../models/balance.model');
/**
 * Enqueue a new trade job into the queue.
 * @param {Object} tradeData - { tokenIn, amount, protocol }
 * @returns {Promise<string>} Job ID
 */
exports.enqueueTradeJob = async (tradeData) => {
  // Add the job to the queue with retry options if desired
  const job = await tradeQueue.add('trade', tradeData, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  });
  return job.id;
};

/**
 * Process a trade job (called by the worker).
 * Checks wallet eligibility, triggers emergency rebalancing if needed,
 * derives the wallet from KMS (to include the private key), and executes the trade via the correct protocol adapter.
 */
exports.processTradeJob = async (job) => {
  const { tokenIn, tokenOut, amount, protocol } = job.data;

  // 1. Get an eligible wallet from your DB (this returns a wallet document without private key)
  let walletRecord = await getEligibleWalletForTrade(tokenIn, amount);
  if (!walletRecord) {
    // If no wallet qualifies, trigger emergency rebalance (stub function below)
    walletRecord = await triggerEmergencyRebalance(tokenIn, amount);
    if (!walletRecord) {
      throw new Error('No wallet available to execute trade, even after emergency rebalancing.');
    }
  }

  // 2. Derive a signing wallet using your KMS-based HD wallet logic.
  //    This returns an ethers wallet that includes the private key.
  const derivedWallet = await getDerivedWallet(walletRecord);

  // 3. Select the appropriate protocol adapter based on the protocol parameter.
  const adapter = await protocolAdapters[protocol.toLowerCase()];
  console.log('Selected adapter:', adapter);
  if (!adapter) {
    throw new Error(`Protocol adapter for ${protocol} not found.`);
  }
  const tokenInDoc = await require('../models/cryptoToken.model').findById(tokenIn);
  if (!tokenInDoc || !tokenInDoc.tokenAddress) {
    throw new Error(`Token document not found or missing tokenAddress for tokenIn ID: ${tokenIn}`);
  }
  const tokenOutDoc = await require('../models/cryptoToken.model').findById(tokenOut);
  if (!tokenOutDoc || !tokenOutDoc.tokenAddress) {
    throw new Error(`Token document not found or missing tokenAddress for tokenOut ID: ${tokenOut}`);
  }

  // 4. Execute the trade using the derived wallet.
  const result = await adapter.executeTrade(
    derivedWallet,
    amount,
    config.quickswap.slippageTolerance,
    tokenInDoc,
    tokenOutDoc
  );

  // 5. Update wallet balances for both tokens concurrently.
  if (result.decimalsIn && result.decimalsOut) {
    const amountIn = ethers.parseUnits(result.amountIn, Number(result.decimalsIn));
    const amountOut = ethers.parseUnits(result.amountOut, Number(result.decimalsOut));
    await Promise.all([
      balanceModel.updateOne({ wallet: walletRecord._id, token: tokenIn }, { $inc: { balance: (-amountIn).toString() } }),
      balanceModel.updateOne({ wallet: walletRecord._id, token: tokenOut }, { $inc: { balance: amountOut.toString() } }),
    ]);
  }
  return result;
};

/**
 * A stub function to trigger emergency rebalancing.
 * Replace this with your actual rebalancing or fund collection logic.
 */
async function triggerEmergencyRebalance(tokenIn, amount) {
  console.log('Triggering emergency rebalance for tokenIn:', tokenIn, 'amount:', amount);
  // For example, you might call:
  // return await rebalancingService.transferFromEmergencyWallet(tokenIn, amount);
  // Here we return null to indicate that no wallet is available.
  return null;
}

async function getDerivedWallet(wallet) {
  const genConfig = await WalletGenerationConfig.findById(wallet.walletGenerationConfig);
  if (!genConfig) throw new Error('Wallet generation config not found: ' + wallet._id);
  const hdWallet = await getHDWallet(genConfig.derivation_path);
  return hdWallet.derivePath(`${wallet.hd_index}`);
}
