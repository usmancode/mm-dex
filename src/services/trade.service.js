const { ethers } = require('ethers');
const { tradeQueue } = require('../queues/trade.queue');
const { getEligibleWalletForTrade } = require('./walletEligibility.service');
const protocolAdapters = require('../adapters/protocolAdapters');
const config = require('../config/config');
const balanceModel = require('../models/balance.model');
const TransferService = require('./transferService');
const WalletTypes = require('../enums/walletTypes');
const Wallet = require('../models/wallet.model');
const BalanceService = require('./balance.service');

const { getDerivedWallet, getGasStationWallet } = require('./walletService');

exports.enqueueTradeJob = async (tradeData) => {
  const job = await tradeQueue.add('trade', tradeData, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  });
  return job.id;
};

exports.processTradeJob = async (job) => {
  const { tokenIn, tokenOut, amount, protocol } = job.data;

  const tokenInDoc = await require('../models/cryptoToken.model').findById(tokenIn);
  if (!tokenInDoc || !tokenInDoc.tokenAddress) {
    throw new Error(`TokenIn document not found or missing tokenAddress: ${tokenIn}`);
  }
  const tokenOutDoc = await require('../models/cryptoToken.model').findById(tokenOut);
  if (!tokenOutDoc || !tokenOutDoc.tokenAddress) {
    throw new Error(`TokenOut document not found or missing tokenAddress: ${tokenOut}`);
  }
  let walletRecord = await getEligibleWalletForTrade(tokenIn, amount, tokenInDoc.decimals);
  if (!walletRecord) {
    walletRecord = await triggerEmergencyRebalance(protocol, tokenInDoc, tokenOutDoc, amount);
    if (!walletRecord) {
      throw new Error('No wallet available for trade, even after emergency rebalancing.');
    }
  }

  const derivedWallet = await getDerivedWallet(walletRecord);

  const adapter = protocolAdapters[protocol.toLowerCase()];
  if (!adapter) {
    throw new Error(`Protocol adapter for ${protocol} not found.`);
  }

  const gasBalance = await BalanceService.balanceOf(config.nativeTokenAddress, walletRecord.address, protocol, true);
  if (gasBalance < config[protocol].minNativeForGas) {
    console.log(`Insufficient gas in wallet ${walletRecord.address} on ${protocol}. Refilling now...`);
    const gasStationWallet = await getGasStationWallet();
    const derivedGasStationWallet = await getDerivedWallet(gasStationWallet);
    await TransferService.refillGasForWallet(
      protocol,
      derivedGasStationWallet,
      gasStationWallet._id,
      walletRecord.address,
      config[protocol].minNativeForGas
    );
    console.log(`Gas balance refilled for ${walletRecord.address}`);
  }

  const result = await adapter.executeTrade(
    derivedWallet,
    amount,
    config.quickswap.slippageTolerance,
    tokenInDoc,
    tokenOutDoc,
    protocol
  );

  if (result.decimalsIn && result.decimalsOut) {
    const amountInBalance = await BalanceService.balanceOf(tokenInDoc.tokenAddress, walletRecord.address, protocol, false);
    const amountOutBalance = await BalanceService.balanceOf(tokenOutDoc.tokenAddress, walletRecord.address, protocol, false);
    const updatedGasBalance = await BalanceService.balanceOf(
      config.nativeTokenAddress,
      walletRecord.address,
      protocol,
      true
    );

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
        { balance: updatedGasBalance.toString() },
        { upsert: true }
      ),
    ]);
  }
  return result;
};

async function triggerEmergencyRebalance(protocol, tokenInDoc, tokenOutDoc, amount) {
  try {
    console.log(`Initiating emergency rebalance for ${tokenInDoc.tokenAddress}, amount: ${amount}`);
    const fundingWallet = await getFundingWallet();
    const gasStationWallet = await getGasStationWallet();
    const derivedFundingWallet = await getDerivedWallet(fundingWallet);
    const derivedGasStationWallet = await getDerivedWallet(gasStationWallet);

    const receipt = await TransferService.executeTransfer(
      protocol.toLowerCase(),
      derivedFundingWallet,
      fundingWallet.id,
      derivedGasStationWallet,
      gasStationWallet.id,
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
  if (!fundingWallet) {
    throw new Error('Funding wallet not found');
  }
  return fundingWallet;
}
