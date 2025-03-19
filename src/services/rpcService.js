const ethers = require('ethers');
// if you are using ESM style imports, use this line instead:
// import { ethers } from "ethers";
const config = require('../config/config');

(async () => {
  console.log('Connecting to RPC endpoint...', config.rpc.quicknode);
  const provider = new ethers.JsonRpcProvider(`${config.rpc.quicknode}`);
  const blockNum = await provider.getBlockNumber();
  console.log(blockNum);
})();
