// transfer-service.js
const { ethers } = require('ethers');
const config = require('../config/config');
const WalletUsage = require('../models/walletUsage.model');
const balanceModel = require('../models/balance.model');

class TransferService {
  constructor() {}

  async createProvider(protocol) {
    if (!config.rpc[protocol]) {
      throw new Error(`Unsupported protocol: ${protocol}`);
    }
    return new ethers.JsonRpcProvider(config.rpc[protocol]);
  }
  async createSigner(protocol, derivedWallet) {
    const provider = await this.createProvider(protocol);
    return new ethers.Wallet(derivedWallet.privateKey, provider);
  }

  async getWithdrawalAddress(tokenAddress, protocol) {
    const eligibleWallets = await WalletUsage.find({ tokenAddress }).populate('wallet');
    if (eligibleWallets.length === 0) {
      console.log('No eligible wallets found');
      return null;
    }

    // Randomly select a wallet from the eligible list
    const randomIndex = Math.floor(Math.random() * eligibleWallets.length);
    const selectedWallet = eligibleWallets[randomIndex];
    if (!selectedWallet) throw new Error(`No withdrawal address found for ${protocol}`);
    return selectedWallet.wallet;
  }

  async transferNativeToken(signer, toAddress, amount, decimals) {
    const tx = {
      to: toAddress,
      value: ethers.parseUnits(amount.toString(), decimals),
    };
    console.log('Native Token Transfer Transaction:', tx);
    const txResponse = await signer.sendTransaction(tx);
    return txResponse.wait();
  }

  async refillGas(signer, toAddress, amount) {
    const tx = {
      to: toAddress,
      value: amount,
    };
    console.log('Refilling Gas Transaction:', tx);
    const txResponse = await signer.sendTransaction(tx);
    return txResponse.wait();
  }

  async refillGasForWallet(protocol, derivedWallet, toAddress, amount) {
    const signer = await this.createSigner(protocol, derivedWallet);

    const tx = {
      to: toAddress,
      value: amount,
    };
    console.log('Refilling Gas Transaction Before Executing Tx:', tx);
    const txResponse = await signer.sendTransaction(tx);
    return txResponse.wait();
  }

  async transferERC20Token(signer, tokenContractAddress, toAddress, amount, decimals) {
    const erc20Abi = ['function transfer(address to, uint256 value)', 'function decimals()'];
    const contract = new ethers.Contract(tokenContractAddress, erc20Abi, signer);

    const parsedAmount = ethers.parseUnits(amount.toString(), decimals);
    console.log('ERC20 Token Transfer Transaction:', { toAddress, parsedAmount });

    const tx = await contract.transfer(toAddress, parsedAmount, {
      gasLimit: 100000,
    });
    return tx.wait();
  }

  async checkNativeBalanceForGas(wallet, protocol) {
    const provider = await this.createProvider(protocol);
    const balance = await provider.getBalance(wallet.address);
    if (balance < config[protocol].minNativeForGas) {
      console.log(`Low native balance for gas on ${protocol}: ${wallet.address}`);
      return false;
    }
    return true;
  }

  async executeTransfer(protocol, derivedWallet, tokenInDoc, tokenOutDoc, amount) {
    try {
      const signer = await this.createSigner(protocol, derivedWallet);
      let wallet;
      if (!tokenInDoc.isNative) {
        wallet = await this.getWithdrawalAddress(tokenInDoc.tokenAddress, protocol);
      } else {
        wallet = await this.getWithdrawalAddress(tokenOutDoc.tokenAddress, protocol);
      }

      if (tokenInDoc.isNative) {
        await this.transferNativeToken(signer, wallet.address, amount, tokenInDoc.decimals);
        await balanceModel.updateOne(
          { address: wallet.address, tokenAddress: tokenInDoc.tokenAddress },
          { $inc: { balance: amount.toString() } }
        );
        console.log(`Native token transfer successful to ${withdrawalAddress}`);
        return wallet;
      }
      await this.transferERC20Token(signer, tokenInDoc.tokenAddress, wallet.address, amount, tokenInDoc.decimals);
      await balanceModel.updateOne(
        { address: wallet.address, tokenAddress: tokenInDoc.tokenAddress },
        { $inc: { balance: amount.toString() } }
      );
      console.log(`ERC20 token transfer successful to ${wallet.address}`);
      if (!(await this.checkNativeBalanceForGas(wallet, protocol))) {
        console.log(`Refilling gas for ${wallet.address}`, config[protocol].minNativeForGas);
        await this.refillGas(signer, wallet.address, config[protocol].minNativeForGas);
      }
      return wallet;
    } catch (error) {
      console.error(`Transfer failed on ${protocol}:`, error);
      throw error;
    }
  }
}

module.exports = new TransferService();
