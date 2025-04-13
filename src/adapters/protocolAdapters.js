// src/adapters/protocolAdapters.js
const uniswapAdapter = require('./uniswapAdapter');
const quickswapAdapter = require('./quickswapAdapter');
const pancakeswapAdapter = require('./pancakeswapAdapter');

module.exports = {
  uniswap: uniswapAdapter,
  quickswap: quickswapAdapter,
  pancakeswap: pancakeswapAdapter,
};
