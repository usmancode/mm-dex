const { ethers } = require('ethers');
const SWAP_ROUTER_ABI = require('../config/abis/UniswapRouter.json');
const POOL_ABI = require('../config/abis/UniswapPool.json');
const ERC20_ABI = require('../config/abis/TrumpToken.json');
const config = require('../config/config');
const { getUniswapV3PoolBalances } = require('../utils/priceFetcher');

async function approveToken(tokenAddress, tokenABI, amount, signerWallet, swapRouterAddress) {
  // Validate input parameters
  if (!amount || typeof amount === 'undefined') {
    throw new Error('Invalid amount parameter: cannot be undefined or null');
  }

  const tokenContract = new ethers.Contract(tokenAddress, tokenABI, signerWallet.provider);
  const currentAllowance = await tokenContract.allowance(signerWallet.address, swapRouterAddress);

  // Safe conversion with validation
  const amountWei = ethers.toBigInt(amount.toString()); // Convert to string first

  if (currentAllowance >= amountWei) {
    console.log(`Sufficient allowance: ${currentAllowance}`);
    return currentAllowance;
  }

  const approve100TimesAmount = amountWei * 100n;
  console.log(`Approving 100x (${approve100TimesAmount} Wei)...`);

  // Get fee data with enhanced error handling
  let feeData;
  try {
    feeData = await signerWallet.provider.getFeeData();
  } catch (error) {
    console.error('Failed to get fee data:', error);
    feeData = {
      lastBaseFeePerGas: ethers.parseUnits('0.1', 'gwei'),
      gasPrice: ethers.parseUnits('0.1', 'gwei'),
    };
  }

  // Gas configuration with fallback values
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

  // Debugging logs
  console.log('Gas Parameters:', {
    maxFeePerGas: gasParams.maxFeePerGas?.toString(),
    maxPriorityFeePerGas: gasParams.maxPriorityFeePerGas?.toString(),
    gasPrice: gasParams.gasPrice?.toString(),
  });

  try {
    const approveTx = await tokenContract.connect(signerWallet).approve(
      swapRouterAddress,
      approve100TimesAmount.toString(), // Convert to string for legacy systems
      gasParams
    );

    const receipt = await approveTx.wait();
    console.log('Transaction mined:', receipt.hash);
    return approve100TimesAmount;
  } catch (error) {
    console.error('Approval failed:', error);
    throw new Error(`Token approval failed: ${error.shortMessage}`);
  }
}
// Convert scientific notation to a fixed decimal string
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

exports.executeTrade = async (wallet, amountHuman, slippageTolerance, tokenIn, tokenOut) => {
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
      const txResponse = await swapRouter.exactInputSingle(params, overrides);

      console.log(`Transaction submitted: ${txResponse.hash}`);
      const receipt = await txResponse.wait();

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
    console.error('Trade Execution Error:', error);
    return { error: error.message };
  }
};
