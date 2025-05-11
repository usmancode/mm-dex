const { ethers } = require('ethers');
const { tradeQueue } = require('../queues/trade.queue');
const { getEligibleWalletForTrade } = require('./walletEligibility.service');
const protocolAdapters = require('../adapters/protocolAdapters');
const config = require('../config/config');
const balanceModel = require('../models/balance.model');
const TransferService = require('./transfer.service');
const WalletTypes = require('../enums/walletTypes');
const Wallet = require('../models/wallet.model');
const BalanceService = require('./balance.service');
const Pool = require('../models/pool.model');

const { getDerivedWallet, getGasStationWallet } = require('./wallet.service');

exports.enqueueTradeJob = async (tradeData) => {
  const job = await tradeQueue.add('trade', tradeData, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  });
  return job.id;
};

const initialChecks = (pool) => {
  if (!pool) {
    throw new Error(`Pool not found for address: ${pool}`);
  }
  if (!pool.protocol) {
    throw new Error(`Protocol not found for pool: ${pool}`);
  }
  if (!pool.active) {
    throw new Error(`Pool is not active: ${pool}`);
  }
  if (!pool.token0 || !pool.token1) {
    throw new Error(`Token0 or Token1 not found for pool: ${pool}`);
  }
  if (!pool.slippageTolerance) {
    throw new Error(`Slippage tolerance not set for pool: ${pool}`);
  }
  if (!pool.feeTier) {
    throw new Error(`Fee tier not set for pool: ${pool}`);
  }
  if (!pool.poolAddress) {
    throw new Error(`Pool address not set for pool: ${pool}`);
  }
  if (!pool.chainId) {
    throw new Error(`Chain ID not set for pool: ${pool}`);
  }
};

exports.processTradeJob = async (job) => {
  const { action, amount, poolId } = job.data;

  const pool = await Pool.findById(poolId).populate('token0 token1');

  initialChecks(pool);

  const tokenInDoc = action === 'buy' ? pool.token0 : pool.token1;
  const tokenOutDoc = action === 'buy' ? pool.token1 : pool.token0;
  if (!tokenInDoc || !tokenOutDoc) {
    throw new Error(`TokenIn or TokenOut not found for pool: ${poolId}`);
  }
  const tokenIn = tokenInDoc.id;
  const tokenOut = tokenOutDoc.id;
  const protocol = pool.protocol.toLowerCase();

  let walletRecord = await getEligibleWalletForTrade(tokenIn, amount, tokenInDoc.decimals);
  if (!walletRecord) {
    walletRecord = await triggerEmergencyRebalance(protocol, tokenInDoc, tokenOutDoc, amount, chainId);
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
  const minNativeForGas = Number(pool.minNativeForGas.toString());
  if (gasBalance < minNativeForGas) {
    console.log(`Insufficient gas in wallet ${walletRecord.address} on ${protocol}. Refilling now...`);
    const gasStationWallet = await getGasStationWallet();
    const derivedGasStationWallet = await getDerivedWallet(gasStationWallet);
    await TransferService.refillGasForWallet(
      protocol,
      derivedGasStationWallet,
      gasStationWallet._id,
      walletRecord.address,
      minNativeForGas,
      pool.chainId,
      pool.id
    );
    console.log(`Gas balance refilled for ${walletRecord.address}`);
  }

  const result = await adapter.executeTrade(
    derivedWallet,
    amount,
    pool.slippageTolerance,
    tokenInDoc,
    tokenOutDoc,
    protocol,
    pool.poolAddress,
    pool.chainId,
    pool.feeTier,
    protocol,
    pool.id
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
        { upsert: true, new: true }
      ),
      balanceModel.updateOne(
        { wallet: walletRecord._id, token: tokenOut },
        { balance: amountOutBalance.toString() },
        { upsert: true, new: true }
      ),
      balanceModel.updateOne(
        { wallet: walletRecord._id, isNative: true },
        { balance: updatedGasBalance.toString() },
        { upsert: true, new: true }
      ),
    ]);
  }
  return result;
};

async function triggerEmergencyRebalance(protocol, tokenInDoc, tokenOutDoc, amount, chainId) {
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
      amount,
      chainId
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
