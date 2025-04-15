const { ethers } = require('ethers');
const SWAP_ROUTER_ABI = require('../config/abis/UniswapRouter.json');
const POOL_ABI = require('../config/abis/UniswapPool.json');
const ERC20_ABI = require('../config/abis/TrumpToken.json');
const config = require('../config/config');
const { getUniswapV3PoolBalances } = require('../utils/priceFetcher');
const TransactionService = require('../services/transaction.service');
const TxnStatus = require('../enums/txnStatus');
const Wallet = require('../models/wallet.model');
const TxnTypes = require('../enums/txnTypes');
const BalanceService = require('../services/balance.service');
const WalletTypes = require('../enums/walletTypes');
const { getHDWallet } = require('../services/walletService');
const WalletGenerationConfig = require('../models/walletGenerationConfig.model');
const TransferService = require('../services/transferService');

async function approveToken(tokenAddress, tokenABI, amount, signerWallet, swapRouterAddress) {
  if (!amount || typeof amount === 'undefined') {
    throw new Error('Invalid amount parameter: cannot be undefined or null');
  }

  const tokenContract = new ethers.Contract(tokenAddress, tokenABI, signerWallet.provider);
  const currentAllowance = await tokenContract.allowance(signerWallet.address, swapRouterAddress);

  const amountWei = ethers.toBigInt(amount.toString());

  if (currentAllowance >= amountWei) {
    console.log(`Sufficient allowance: ${currentAllowance}`);
    return currentAllowance;
  }

  const approve100TimesAmount = amountWei * 100n;
  console.log(`Approving 100x (${approve100TimesAmount} Wei)...`);

  let feeData;
  let transaction;
  try {
    feeData = await signerWallet.provider.getFeeData();
  } catch (error) {
    console.error('Failed to get fee data:', error);
    feeData = {
      lastBaseFeePerGas: ethers.parseUnits('0.1', 'gwei'),
      gasPrice: ethers.parseUnits('0.1', 'gwei'),
    };
  }

  const gasParams = {
    gasLimit: 60000n,
  };

  if (feeData.lastBaseFeePerGas) {
    const baseFee = ethers.toBigInt(feeData.lastBaseFeePerGas);
    const baseFeeWithBuffer = (baseFee * 11n) / 10n;
    gasParams.maxPriorityFeePerGas = ethers.parseUnits('0.1', 'gwei');
    gasParams.maxFeePerGas = baseFeeWithBuffer + gasParams.maxPriorityFeePerGas;
  } else {
    gasParams.gasPrice = ethers.parseUnits('0.1', 'gwei');
  }

  try {
    const walletId = await getWalletIdByAddress(signerWallet.address);
    transaction = await TransactionService.createTransaction({
      walletId: walletId,
      amount: approve100TimesAmount.toString(),
      transactionHash: null,
      status: TxnStatus.PENDING,
      params: gasParams,
      chainId: config.uniswap.chainId,
      dex: config.uniswap.name,
      txnType: TxnTypes.APPROVE,
      message: 'Transaction initiated',
    });
    const approveTx = await tokenContract
      .connect(signerWallet)
      .approve(swapRouterAddress, approve100TimesAmount.toString(), gasParams);
    await TransactionService.updateTransaction(transaction.id, {
      transactionHash: approveTx.hash,
      message: 'Transaction submitted to network',
    });

    const receipt = await approveTx.wait();
    await TransactionService.updateTransaction(transaction.id, {
      status: receipt.status === 1 ? TxnStatus.SUCCESS : TxnStatus.FAILED,
      message: receipt.status === 1 ? 'Transaction confirmed' : 'Transaction reverted',
    });
    return approve100TimesAmount;
  } catch (error) {
    if (transaction) {
      await TransactionService.updateTransaction(transaction.id, {
        status: TxnStatus.FAILED,
        message: error.message || 'Transaction failed',
      });
    }
    console.error('Approval failed:', error);
    throw new Error(`Token approval failed: ${error.shortMessage}`);
  }
}
function toFixedString(value) {
  const valueStr = value.toString();
  if (!valueStr.includes('e-')) return valueStr;

  const [base, exponent] = valueStr.split('e-');
  const decimalPlaces = parseInt(exponent, 10);

  return '0.' + '0'.repeat(decimalPlaces - 1) + base.replace('.', '');
}

async function calculateSwapAmounts(poolAddress, tokenIn, tokenOut, amountHuman, slippage, provider) {
  const pool = new ethers.Contract(poolAddress, POOL_ABI, provider);

  const [token0, token1] = await Promise.all([pool.token0(), pool.token1()]);
  const [token0Decimals, token1Decimals] = await Promise.all([
    new ethers.Contract(token0, ERC20_ABI, provider).decimals(),
    new ethers.Contract(token1, ERC20_ABI, provider).decimals(),
  ]);

  const isToken0 = tokenIn.tokenAddress.toLowerCase() === token0.toLowerCase();
  const decimalsIn = isToken0 ? token0Decimals : token1Decimals;
  const decimalsOut = isToken0 ? token1Decimals : token0Decimals;
  console.log('decimalsIn', decimalsIn);
  const amountWei = ethers.parseUnits(amountHuman.toString(), decimalsIn);
  console.log('amountWei', amountWei);
  const slippageMultiplier = 1000n - BigInt(Math.round(slippage * 10));
  const amountOutMin = await getUniswapV3PoolBalances(
    poolAddress,
    tokenIn.tokenAddress,
    tokenOut.tokenAddress,
    Number(amountHuman)
  );

  const amountOutMinStr = toFixedString(amountOutMin);
  const parts = amountOutMinStr.split('.');
  let truncatedAmount = parts[0];
  if (parts.length > 1) {
    // Truncate decimals to 18 places (match decimalsIn)
    truncatedAmount += '.' + parts[1].slice(0, 18);
  }

  let resultWei = ethers.parseUnits(truncatedAmount, decimalsIn);
  console.log('resultWei', resultWei);
  return {
    amountIn: amountWei,
    amountOutMin: (resultWei * slippageMultiplier) / 1000n,
    decimalsIn,
    decimalsOut,
  };
}

exports.executeTrade = async (wallet, amountHuman, slippageTolerance, tokenIn, tokenOut, protocol) => {
  let transaction;
  try {
    const provider = new ethers.JsonRpcProvider(config.rpc.quicknode);
    const signer = new ethers.Wallet(wallet.privateKey, provider);
    const swapRouter = new ethers.Contract(config.uniswap.routerAddress, SWAP_ROUTER_ABI, signer);

    const poolAddress = config.uniswap.poolAddress;
    const { amountIn, amountOutMin, decimalsIn, decimalsOut } = await calculateSwapAmounts(
      poolAddress,
      tokenIn,
      tokenOut,
      amountHuman,
      slippageTolerance,
      provider
    );

    if (await approveToken(tokenIn.tokenAddress, ERC20_ABI, amountIn, signer, swapRouter.target)) {
      const params = {
        tokenIn: tokenIn.tokenAddress,
        tokenOut: tokenOut.tokenAddress,
        fee: config.uniswap.FEE_TIER,
        recipient: signer.address,
        amountOutMinimum: amountOutMin,
        amountIn: amountIn,
        sqrtPriceLimitX96: 0,
      };
      const overrides = tokenIn.isNative ? { value: amountIn } : {};
      console.log('params', params);
      const walletId = await getWalletIdByAddress(signer.address);
      if ((await checkBalance(signer.address, config.uniswap.name, true)) < config[protocol].minNativeForGas) {
        const gasStationWallet = await getGasStationWallet();
        const derivedGasStationWallet = await getDerivedWallet(gasStationWallet);
        await TransferService.refillGasForWallet(
          config.uniswap.name,
          derivedGasStationWallet,
          gasStationWallet._id,
          signer.address,
          config[protocol].minNativeForGas
        );
      }

      transaction = await TransactionService.createTransaction({
        walletId: walletId,
        amount: amountIn,
        transactionHash: null,
        status: TxnStatus.PENDING,
        params: params,
        chainId: config.uniswap.chainId,
        dex: config.uniswap.name,
        txnType: TxnTypes.SWAP,
        message: 'Transaction initiated',
      });
      const txResponse = await swapRouter.exactInputSingle(params, overrides);
      await TransactionService.updateTransaction(transaction.id, {
        transactionHash: txResponse.hash,
        message: 'Transaction submitted to network',
      });

      console.log(`Transaction submitted: ${txResponse.hash}`);
      const receipt = await txResponse.wait();
      await TransactionService.updateTransaction(transaction.id, {
        status: receipt.status === 1 ? TxnStatus.SUCCESS : TxnStatus.FAILED,
        message: receipt.status === 1 ? 'Transaction confirmed' : 'Transaction reverted',
      });

      return {
        transactionHash: receipt.hash,
        status: receipt.status,
        amountIn: ethers.formatUnits(amountIn, decimalsIn),
        decimalsIn: decimalsIn.toString(),
        amountOut: ethers.formatUnits(amountOutMin, decimalsOut),
        decimalsOut: decimalsOut.toString(),
      };
    }
    console.error('Token approval failed');
  } catch (error) {
    if (transaction) {
      await TransactionService.updateTransaction(transaction.id, {
        status: TxnStatus.FAILED,
        message: error.message || 'Transaction failed',
      });
    }

    console.error('Trade Execution Error:', error);
    return { status: 'failed', error: error.message };
  }
};

async function checkBalance(walletAddress, protocol, isNative) {
  return await BalanceService.balanceOf(null, walletAddress, protocol, isNative);
}

async function getWalletIdByAddress(walletAddress) {
  const wallet = await Wallet.findOne({ address: walletAddress });
  if (!wallet) {
    throw new Error('Wallet not found');
  }
  return wallet.id;
}

async function getGasStationWallet() {
  const gasStationWallet = await Wallet.findOne({ status: 'active', type: WalletTypes.GAS_STATION }).lean();
  if (!gasStationWallet) throw new Error('Gas station wallet not found');
  return gasStationWallet;
}

async function getDerivedWallet(wallet) {
  const genConfig = await WalletGenerationConfig.findById(wallet.walletGenerationConfig);
  if (!genConfig) throw new Error('Wallet generation config not found: ' + wallet._id);
  const hdWallet = await getHDWallet(genConfig.derivation_path);
  return hdWallet.derivePath(`${wallet.hd_index}`);
}
