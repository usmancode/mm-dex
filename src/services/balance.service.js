const { ethers } = require('ethers');
const config = require('../config/config');
const TrumpToken = require('../config/abis/TrumpToken.json');

class BalanceService {
  constructor() {}

  async createProvider(protocol) {
    if (!config.rpc[protocol]) {
      throw new Error(`Unsupported protocol: ${protocol}`);
    }
    return new ethers.JsonRpcProvider(config.rpc[protocol]);
  }

  async balanceOf(tokenContractAddress, walletAddress, protocol, isNative) {
    const provider = await this.createProvider(protocol);

    if (isNative) {
      const balance = await provider.getBalance(walletAddress);
      return balance;
    } else {
      const contract = new ethers.Contract(tokenContractAddress, TrumpToken, provider);
      const balance = await contract.balanceOf(walletAddress);
      return balance;
    }
  }
}

module.exports = new BalanceService();
