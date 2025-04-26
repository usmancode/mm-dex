const { ethers } = require('ethers');
const config = require('../config/config');

const ERC20_ABI = require('../config/abis/TrumpToken.json');

async function getUniswapV3PoolBalances(poolAddress, tokenIn, tokenOut, amountHuman) {
  try {
    const provider = new ethers.JsonRpcProvider(config.rpc.quicknode);
    const token0Address = tokenIn;
    const token1Address = tokenOut;
    const token0Contract = new ethers.Contract(token0Address, ERC20_ABI, provider);
    const token1Contract = new ethers.Contract(token1Address, ERC20_ABI, provider);

    const [balance0Raw, balance1Raw, decimals0, decimals1] = await Promise.all([
      token0Contract.balanceOf(poolAddress),
      token1Contract.balanceOf(poolAddress),
      token0Contract.decimals(),
      token1Contract.decimals(),
    ]);
    const balance0 = ethers.formatUnits(balance0Raw, decimals0);
    const balance1 = ethers.formatUnits(balance1Raw, decimals1);
    const deltaY = computeDeltaY(balance0, balance1, amountHuman);
    console.log('deltaY:', deltaY);
    return deltaY;
  } catch (error) {
    console.error('Error fetching pool balances:', error);
  }
}
//x=tokenOut and y=tokenIn
function computeDeltaY(x, y, deltaX) {
  const numerator = x * y;
  const denominator = Number(x) + deltaX;
  const deltaY = Number(y) - numerator / denominator;
  return deltaY;
}

module.exports = {
  getUniswapV3PoolBalances,
};
