const { ethers } = require('ethers');
const { tradeQueue } = require('../queues/trade.queue');
const { getEligibleWalletForTrade } = require('./walletEligibility.service');
const protocolAdapters = require('../adapters/protocolAdapters'); // Exports mapping of adapters
const { getHDWallet } = require('./walletService');
const WalletGenerationConfig = require('../models/walletGenerationConfig.model');
const config = require('../config/config');
const balanceModel = require('../models/balance.model');
const transferService = require('./transferService');
const WalletTypes = require('../enums/walletTypes');
const Wallet = require('../models/wallet.model');
const BalanceService = require('./balance.service');

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

  const tokenInDoc = await require('../models/cryptoToken.model').findById(tokenIn);
  if (!tokenInDoc || !tokenInDoc.tokenAddress) {
    throw new Error(`Token document not found or missing tokenAddress for tokenIn ID: ${tokenIn}`);
  }
  const tokenOutDoc = await require('../models/cryptoToken.model').findById(tokenOut);
  if (!tokenOutDoc || !tokenOutDoc.tokenAddress) {
    throw new Error(`Token document not found or missing tokenAddress for tokenOut ID: ${tokenOut}`);
  }
  let walletRecord = await getEligibleWalletForTrade(tokenIn, amount, tokenInDoc.decimals);
  //let walletRecord = await triggerEmergencyRebalance(protocol, tokenInDoc, tokenOutDoc, amount);
  if (!walletRecord) {
    // If no wallet qualifies, trigger emergency rebalance
    // walletRecord = await triggerEmergencyRebalance(protocol, tokenInDoc, tokenOutDoc, amount);
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
  if (
    (await checkBalance(config.nativeTokenAddress, walletRecord.address, protocol, true)) < config[protocol].minNativeForGas
  ) {
    console.log(`Insufficient gas balance in ${protocol} ${walletRecord.address}. Attempting to refill...`);
    const fundingWallet = await getFundingWallet();
    const derivedWallet = await getDerivedWallet(fundingWallet);
    await transferService.refillGasForWallet(
      protocol,
      derivedWallet,
      walletRecord.address,
      config[protocol].minNativeForGas
    );
    console.log(`Gas balance refilled to ${walletRecord.address}`);
  }
  // 4. Execute the trade using the derived wallet.
  const result = await adapter.executeTrade(
    derivedWallet,
    amount,
    config.quickswap.slippageTolerance,
    tokenInDoc,
    tokenOutDoc
  );

  //5. Update wallet balances for both tokens concurrently.
  if (result.decimalsIn && result.decimalsOut) {
    const amountInBalance = await checkBalance(tokenInDoc.tokenAddress, walletRecord.address, protocol, false);
    const amountOutBalance = await checkBalance(tokenOutDoc.tokenAddress, walletRecord.address, protocol, false);
    const gasBalance = await checkBalance(config.nativeTokenAddress, walletRecord.address, protocol, true);
    await Promise.all([
      balanceModel.updateOne(
        { wallet: walletRecord._id, token: tokenIn },
        { balance: amountInBalance.toString() },
        { upsert: true }
      ),
      balanceModel.updateOne(
        { wallet: walletRecord._id, token: tokenOut },
        { balance: amountOutBalance.toString() },
        { upsert: true }
      ),
      balanceModel.updateOne(
        { wallet: walletRecord._id, isNative: true },
        { balance: gasBalance.toString() },
        { upsert: true }
      ),
    ]);
  }
  return result;
};

async function checkBalance(tokenContractAddress, walletAddress, protocol, isNative) {
  return await BalanceService.balanceOf(tokenContractAddress, walletAddress, protocol, isNative);
}

async function getDerivedWallet(wallet) {
  const genConfig = await WalletGenerationConfig.findById(wallet.walletGenerationConfig);
  if (!genConfig) throw new Error('Wallet generation config not found: ' + wallet._id);
  const hdWallet = await getHDWallet(genConfig.derivation_path);
  return hdWallet.derivePath(`${wallet.hd_index}`);
}

async function triggerEmergencyRebalance(protocol, tokenInDoc, tokenOutDoc, amount) {
  try {
    console.log(`Initiating rebalance for ${tokenInDoc.tokenAddress}, amount: ${amount}`);

    const fundingWallet = await getFundingWallet();
    const derivedWallet = await getDerivedWallet(fundingWallet);
    const receipt = await transferService.executeTransfer(
      protocol.toLowerCase(),
      derivedWallet,
      tokenInDoc,
      tokenOutDoc,
      amount
    );
    return receipt;
  } catch (error) {
    console.error('Emergency rebalance failed:', error);
    throw error;
  }
}

async function getFundingWallet() {
  const fundingWallet = await Wallet.findOne({ status: 'active', type: WalletTypes.FUNDING }).lean();
  if (!fundingWallet) throw new Error('Funding wallet not found');
  return fundingWallet;
}
