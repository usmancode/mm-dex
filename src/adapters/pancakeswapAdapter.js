// src/adapters/pancakeswapAdapter.js
const { ethers } = require('ethers');
const config = require('../config/config');

exports.executeTrade = async ({ wallet, token, amount }) => {
  const provider = new ethers.JsonRpcProvider(config.rpc.quicknode);
  const signer = new ethers.Wallet(wallet.privateKey, provider);

  const router = new ethers.Contract(config.pancakeswap.routerAddress, config.pancakeswap.routerABI, signer);

  const amountIn = ethers.parseUnits(amount.toString(), 18);
  const amountOutMin = 0;
  const path = [token, config.pancakeswap.WBNB]; // adjust as needed
  const to = wallet.address;
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

  const tx = await router.swapExactTokensForTokens(amountIn, amountOutMin, path, to, deadline);
  const receipt = await tx.wait();

  return {
    transactionHash: receipt.hash,
    status: receipt.status,
  };
};
