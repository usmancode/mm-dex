const Pool = require('../models/pool.model');
const { getUniswapV3PoolBalances } = require('../utils/priceFetcher');
const { ethers } = require('ethers');

async function getPriceData(action, poolId, amountHuman) {
  try {
    const pool = await Pool.findById(poolId).populate('token0 token1');
    const tokenIn = action === 'BUY' ? pool.token0 : pool.token1;
    const tokenOut = action === 'BUY' ? pool.token1 : pool.token0;
    const slippageMultiplier = 1000n - BigInt(Math.round(pool.slippageTolerance * 10));
    const amountOutMin = await getUniswapV3PoolBalances(
      pool.poolAddress,
      tokenIn.tokenAddress,
      tokenOut.tokenAddress,
      Number(amountHuman),
      action
    );

    const amountOutMinStr = toFixedString(amountOutMin);
    const parts = amountOutMinStr.split('.');
    let truncatedAmount = parts[0];
    if (parts.length > 1) {
      truncatedAmount += '.' + parts[1].slice(0, 18);
    }

    let resultWei = ethers.parseUnits(truncatedAmount, tokenOut.decimals);
    console.log('resultWei', resultWei);

    const finalResult = (resultWei * slippageMultiplier) / 1000n;

    return { result: ethers.formatEther(finalResult) };
  } catch (error) {
    console.error('Error fetching price data:', error);
    throw new Error('Failed to fetch price data');
  }
}

function toFixedString(value) {
  const valueStr = value.toString();
  if (!valueStr.includes('e-')) return valueStr;

  const [base, exponent] = valueStr.split('e-');
  const decimalPlaces = parseInt(exponent, 10);

  return '0.' + '0'.repeat(decimalPlaces - 1) + base.replace('.', '');
}

module.exports = {
  getPriceData,
};
