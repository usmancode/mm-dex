const { ethers } = require('ethers');
const config = require('../config/config');
const WalletUsage = require('../models/walletUsage.model');
const balanceModel = require('../models/balance.model');
const TransactionService = require('./transaction.service');
const TxnStatus = require('../enums/txnStatus');
const TxnTypes = require('../enums/txnTypes');
const Pool = require('../models/pool.model');
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

  async transferNativeToken(signer, toAddress, amount, decimals, derivedWalletId, chainId, poolId) {
    let transaction;
    try {
      const tx = {
        to: toAddress,
        value: ethers.parseUnits(amount.toString(), decimals),
      };
      console.log('Native Token Transfer Transaction:', tx);
      transaction = await TransactionService.createTransaction({
        walletId: derivedWalletId,
        amount: tx.value,
        transactionHash: null,
        status: TxnStatus.PENDING,
        params: tx,
        chainId: chainId,
        txnType: TxnTypes.REBALANCING,
        poolId: poolId,
        message: 'Transaction initiated',
      });

      const txResponse = await signer.sendTransaction(tx);
      await TransactionService.updateTransaction(transaction.id, {
        transactionHash: txResponse.hash,
        message: 'Transaction submitted to network',
      });
      const receipt = await txResponse.wait();
      await TransactionService.updateTransaction(transaction.id, {
        status: receipt.status === 1 ? TxnStatus.SUCCESS : TxnStatus.FAILED,
        message: receipt.status === 1 ? 'Transaction confirmed' : 'Transaction reverted',
      });

      return receipt;
    } catch (error) {
      if (transaction) {
        await TransactionService.updateTransaction(transaction.id, {
          status: TxnStatus.FAILED,
          message: error.message || 'Transaction failed',
        });
      }
      console.error('Native Token Transfer Error:', error);
      throw error;
    }
  }

  async refillGas(signer, toAddress, gasStationWalletId, amount, chainId, poolId) {
    let transaction;
    try {
      const tx = {
        to: toAddress,
        value: amount,
      };
      console.log('Refilling Gas Transaction:', tx);
      transaction = await TransactionService.createTransaction({
        walletId: gasStationWalletId,
        amount: amount,
        transactionHash: null,
        status: TxnStatus.PENDING,
        params: tx,
        chainId: chainId,
        txnType: TxnTypes.GAS_REFILL,
        poolId: poolId,
        message: 'Transaction initiated',
      });

      const txResponse = await signer.sendTransaction(tx);
      await TransactionService.updateTransaction(transaction.id, {
        transactionHash: txResponse.hash,
        message: 'Transaction submitted to network',
      });
      const receipt = await txResponse.wait();
      await TransactionService.updateTransaction(transaction.id, {
        status: receipt.status === 1 ? TxnStatus.SUCCESS : TxnStatus.FAILED,
        message: receipt.status === 1 ? 'Transaction confirmed' : 'Transaction reverted',
      });

      return receipt;
    } catch (error) {
      if (transaction) {
        await TransactionService.updateTransaction(transaction.id, {
          status: TxnStatus.FAILED,
          message: error.message || 'Transaction failed',
        });
      }
      console.error('Gas Refill Error:', error);
      throw error;
    }
  }

  async refillGasForWallet(protocol, derivedWallet, derivedWalletId, toAddress, amount, chainId, poolId) {
    let transaction;
    try {
      const signer = await this.createSigner(protocol, derivedWallet);
      const tx = { to: toAddress, value: amount };
      console.log('Refilling Gas Transaction Before Executing Tx:', tx);
      transaction = await TransactionService.createTransaction({
        walletId: derivedWalletId,
        amount: amount,
        transactionHash: null,
        status: TxnStatus.PENDING,
        params: tx,
        chainId: chainId,
        txnType: TxnTypes.GAS_REFILL,
        poolId: poolId,
        message: 'Transaction initiated',
      });
      const txResponse = await signer.sendTransaction(tx);
      await TransactionService.updateTransaction(transaction.id, {
        transactionHash: txResponse.hash,
        message: 'Transaction submitted to network',
      });
      const receipt = await txResponse.wait();
      await TransactionService.updateTransaction(transaction.id, {
        status: receipt.status === 1 ? TxnStatus.SUCCESS : TxnStatus.FAILED,
        message: receipt.status === 1 ? 'Transaction confirmed' : 'Transaction reverted',
      });

      return receipt;
    } catch (error) {
      if (transaction) {
        await TransactionService.updateTransaction(transaction.id, {
          status: TxnStatus.FAILED,
          message: error.message || 'Transaction failed',
        });
      }
      console.error('Gas Refill Error:', error);
      throw error;
    }
  }

  async transferERC20Token(signer, tokenContractAddress, toAddress, amount, decimals, derivedWalletId, chainId, poolId) {
    let transaction;
    try {
      const erc20Abi = ['function transfer(address to, uint256 value)', 'function decimals()'];
      const contract = new ethers.Contract(tokenContractAddress, erc20Abi, signer);

      const parsedAmount = ethers.parseUnits(amount.toString(), decimals);
      console.log('ERC20 Token Transfer Transaction:', { toAddress, parsedAmount });

      transaction = await TransactionService.createTransaction({
        walletId: derivedWalletId,
        amount: parsedAmount,
        transactionHash: null,
        status: TxnStatus.PENDING,
        params: { toAddress, parsedAmount },
        chainId: chainId,
        txnType: TxnTypes.REBALANCING,
        poolId: poolId,
        message: 'Transaction initiated',
      });
      const txResponse = await contract.transfer(toAddress, parsedAmount, { gasLimit: 100000 });
      await TransactionService.updateTransaction(transaction.id, {
        transactionHash: txResponse.hash,
        message: 'Transaction submitted to network',
      });
      const receipt = await txResponse.wait();
      await TransactionService.updateTransaction(transaction.id, {
        status: receipt.status === 1 ? TxnStatus.SUCCESS : TxnStatus.FAILED,
        message: receipt.status === 1 ? 'Transaction confirmed' : 'Transaction reverted',
      });
    } catch (error) {
      if (transaction) {
        await TransactionService.updateTransaction(transaction.id, {
          status: TxnStatus.FAILED,
          message: error.message || 'Transaction failed',
        });
      }
      console.error('ERC20 Transfer Error:', error);
      throw error;
    }
  }

  async checkNativeBalanceForGas(wallet, protocol, minGasBalance) {
    const provider = await this.createProvider(protocol);
    const balance = await provider.getBalance(wallet.address);
    if (balance < minGasBalance) {
      console.log(`Low native balance for gas on ${protocol}: ${wallet.address}`);
      return false;
    }
    return true;
  }

  async executeTransfer(
    protocol,
    derivedWallet,
    derivedWalletId,
    gasStation,
    gasStationWalletId,
    tokenInDoc,
    tokenOutDoc,
    amount,
    chainId,
    poolId
  ) {
    try {
      const signer = await this.createSigner(protocol, derivedWallet);
      let withdrawalWallet;
      // If tokenIn is NOT native, we transfer that token. If it is native, we look for the tokenOut-based wallet.
      if (!tokenInDoc.isNative) {
        withdrawalWallet = await this.getWithdrawalAddress(tokenInDoc.tokenAddress, protocol);
      } else {
        withdrawalWallet = await this.getWithdrawalAddress(tokenOutDoc.tokenAddress, protocol);
      }

      if (tokenInDoc.isNative) {
        // Transfer native tokens
        await this.transferNativeToken(
          signer,
          withdrawalWallet.address,
          amount,
          tokenInDoc.decimals,
          derivedWalletId,
          chainId,
          poolId
        );
        await balanceModel.updateOne(
          { address: withdrawalWallet.address, tokenAddress: tokenInDoc.tokenAddress },
          { $inc: { balance: amount.toString() } }
        );
        console.log(`Native token transfer successful to ${withdrawalWallet.address}`);
        return withdrawalWallet;
      }

      // Transfer ERC20
      await this.transferERC20Token(
        signer,
        tokenInDoc.tokenAddress,
        withdrawalWallet.address,
        amount,
        tokenInDoc.decimals,
        derivedWalletId,
        chainId,
        poolId
      );
      await balanceModel.updateOne(
        { address: withdrawalWallet.address, tokenAddress: tokenInDoc.tokenAddress },
        { $inc: { balance: amount.toString() } }
      );
      console.log(`ERC20 token transfer successful to ${withdrawalWallet.address}`);
      const minGasBalance = await Pool.findById(poolId).then((pool) => pool.minGasBalance);
      console.log('minGasBalance', minGasBalance);

      // Ensure the receiving wallet has enough gas
      if (!(await this.checkNativeBalanceForGas(withdrawalWallet, protocol, minGasBalance))) {
        console.log(`Refilling gas for ${withdrawalWallet.address}`);
        const gasStationSigner = await this.createSigner(protocol, gasStation);
        await this.refillGas(gasStationSigner, withdrawalWallet.address, gasStationWalletId, minGasBalance, chainId, poolId);
      }
      return withdrawalWallet;
    } catch (error) {
      console.error(`Transfer failed on ${protocol}:`, error);
      throw error;
    }
  }
}

module.exports = new TransferService();
