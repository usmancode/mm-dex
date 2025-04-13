const { ethers } = require('ethers');
const FACTORY_ABI = require('../config/abis/QuickswapFactory.json');
const SWAP_ROUTER_ABI = require('../config/abis/QuickswapRouter.json');
const POOL_ABI = require('../config/abis/QuickswapPool.json');
const ERC20_ABI = require('../config/abis/TrumpToken.json');
const config = require('../config/config');
const { getUniswapV3PoolBalances } = require('../utils/priceFetcher');
const hundredTimes = 100000000000000000000n;

async function approveToken(tokenAddress, tokenABI, amount, signerWallet, swapRouterAddress, tokenDecimals) {
  const tokenContract = new ethers.Contract(tokenAddress, tokenABI, signerWallet.provider);
  const currentAllowance = await tokenContract.allowance(signerWallet.address, swapRouterAddress);

  if (currentAllowance >= amount) {
    console.log(`Sufficient allowance: ${ethers.formatUnits(currentAllowance, tokenDecimals)}`);
    return currentAllowance;
  }

  const approve100TimesAmount = ethers.parseUnits((amount * hundredTimes).toString(), tokenDecimals);
  console.log(`Approving 100 times more${amount * hundredTimes} tokens...`);
  const approveTx = await tokenContract.connect(signerWallet).approve(swapRouterAddress, approve100TimesAmount);
  await approveTx.wait();
  return approve100TimesAmount;
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

  const amountWei = ethers.parseUnits(amountHuman.toString(), decimalsIn);
  const slippageMultiplier = 1000n - BigInt(Math.round(slippage * 10));
  const amountOutMin = await getUniswapV3PoolBalances(
    poolAddress,
    tokenIn.tokenAddress,
    tokenOut.tokenAddress,
    Number(amountHuman)
  );
  let resultWei = ethers.parseUnits(amountOutMin.toString(), decimalsIn);
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
    const swapRouter = new ethers.Contract(config.quickswap.routerAddress, SWAP_ROUTER_ABI, signer);

    const { amountIn, amountOutMin, decimalsIn, decimalsOut } = await calculateSwapAmounts(
      config.quickswap.poolAddress,
      tokenIn,
      tokenOut,
      amountHuman,
      slippageTolerance,
      provider
    );

    await approveToken(tokenIn.tokenAddress, ERC20_ABI, amountIn, signer, swapRouter.target, decimalsIn);

    const params = {
      tokenIn: tokenIn.tokenAddress,
      tokenOut: tokenOut.tokenAddress,
      recipient: signer.address,
      deadline: Math.floor(Date.now() / 1000) + config.quickswap.DEADLINE_BUFFER,
      amountIn: amountIn,
      amountOutMinimum: amountOutMin,
      limitSqrtPrice: 0,
    };
    const overrides = {};
    console.log('params', params);
    const txResponse = await swapRouter.exactInputSingle(params, overrides);

    console.log(`Transaction submitted: ${txResponse.hash}`);
    const receipt = await txResponse.wait();

    return {
      transactionHash: receipt.hash,
      status: receipt.status,
      amountIn: ethers.formatUnits(amountIn, decimalsIn),
      amountOut: ethers.formatUnits(amountOutMin, decimalsOut),
    };
  } catch (error) {
    console.error('Trade Execution Error:', error);
    return { error: error.message };
  }
};
