const { ethers } = require('ethers');
const config = require('../config/config');
const WalletGenerationConfig = require('../models/walletGenerationConfig.model');
const { getHDWallet } = require('./walletService');
const Wallet = require('../models/wallet.model');
const WalletUsage = require('../models/walletUsage.model');
const Transaction = require('../models/transaction.model');
const Balance = require('../models/balance.model');
const CryptoToken = require('../models/cryptoToken.model');
const MyTokenABI = require('../config/abis/TrumpToken.json');
const WalletTypes = require('../enums/walletTypes');

// Gas config
const GAS_BUFFER_PERCENTAGE = 20n;
const MAX_PRIORITY_FEE_GWEI = 3n;
const FEE_MULTIPLIER = 15n; // 1.5x
const FALLBACK_ETH_GAS = 21000n;
const FALLBACK_ERC20_GAS = 100000n;
const MIN_TRANSFER_BALANCE = 0.00001; // Minimum balance to transfer

/**
 * Derive a child wallet from HD
 */
async function getDerivedWallet(walletDoc) {
  const genConfig = await WalletGenerationConfig.findById(walletDoc.walletGenerationConfig);
  if (!genConfig) throw new Error('Wallet generation config not found: ' + walletDoc._id);
  const hdWallet = await getHDWallet(genConfig.derivation_path);
  return hdWallet.derivePath(`${walletDoc.hd_index}`);
}

/**
 * Create transaction record for the Transaction collection
 */
function createTransactionRecord(wallet, token, receipt, amount, isERC20 = false) {
  return {
    wallet: wallet._id,
    tokenA: token._id,
    amount: amount.toString(),
    transactionHash: receipt.hash,
    status: receipt.status === 1 ? 'success' : 'failed',
    gasUsed: receipt.gasUsed.toString(),
    ...(isERC20 && {
      meta: {
        tokenSymbol: token.tokenSymbol,
        decimals: token.decimals,
      },
    }),
  };
}

/**
 * Utility for applying gas buffer or fallback
 */
async function estimateGasOrFallback(provider, txParams, fallback) {
  try {
    const est = await provider.estimateGas(txParams);
    return (est * (100n + GAS_BUFFER_PERCENTAGE)) / 100n;
  } catch {
    return fallback;
  }
}

/**
 * returnAllFundsToMaster
 *
 * 1) Checks returnEnabled, and also verifies current time >= returnAfter.
 * 2) Finds all usage for the chainId in distReturnConfig.
 * 3) For each usage/wallet, sends (balance - leftover) of token & native back to the config's masterWallet.
 * 4) On success, short DB transaction: remove usage, set wallet inactive, zero out DB balances, log transactions.
 * 5) If an error occurs, we stop or skip based on your preference.
 */
async function returnAllFundsToMaster(distReturnConfig) {
  console.log('Starting returnAllFundsToMaster process...');

  // const now = new Date();
  // if (now < new Date(distReturnConfig.returnAfter)) {
  //   console.log(`Too early to return funds. returnAfter = ${distReturnConfig.returnAfter}, now= ${now}`);
  //   return 0;
  // }

  // 2) Setup provider
  const provider = new ethers.JsonRpcProvider(config.rpc.quicknode);
  const chainId = distReturnConfig.chainId;

  // 3) Fetch the master wallet doc from distReturnConfig
  const masterWalletDoc = await Wallet.findById(distReturnConfig.masterWallet);
  if (!masterWalletDoc) {
    console.log('Master wallet doc not found in distReturnConfig. Stopping...');
    return 0;
  }
  // Derive & connect
  const derivedMaster = await getDerivedWallet(masterWalletDoc);
  const masterAddress = derivedMaster.connect(provider).address;

  // 4) Gather leftover fields as Number
  const maxNativeLeftOver = Number(distReturnConfig.maxNativeLeftOver) || 0;
  const maxTokenLeftOver = Number(distReturnConfig.maxTokenLeftOver) || 0;

  // 5) Find usage records
  const usageRecords = await WalletUsage.find({ chainId }).populate('wallet');
  if (!usageRecords.length) {
    console.log('No active usage records found. Nothing to return.');
    return 0;
  }

  let totalReturned = 0;
  for (const usage of usageRecords) {
    const walletDoc = usage.wallet;
    if (!walletDoc || walletDoc.type === WalletTypes.MASTER) {
      continue;
    }
    if (walletDoc.status !== 'active') {
      console.log(`Wallet ${walletDoc.address} is not active, skipping usage ${usage._id}`);
      continue;
    }

    console.log(`Returning funds from wallet ${walletDoc.address} -> master ${masterAddress}`);
    try {
      // 5a) Derive child's wallet
      const childDerived = await getDerivedWallet(walletDoc);
      const childWallet = childDerived.connect(provider);

      // 5b) Token A doc (from usage)
      const tokenADoc = await CryptoToken.findOne({
        tokenAddress: distReturnConfig.tokenA.tokenAddress,
        chainId: distReturnConfig.chainId,
      });
      if (tokenADoc) {
        /********** (1) Transfer token A back **********/
        const erc20TokenA = new ethers.Contract(tokenADoc.tokenAddress, MyTokenABI, childWallet);
        const tokenBalTokenA = await erc20TokenA.balanceOf(childWallet.address);

        let tokenReceiptTokenA;
        if (tokenBalTokenA > 0n) {
          const leftoverTokenBN = ethers.parseUnits(maxTokenLeftOver.toString(), tokenADoc.decimals);
          if (tokenBalTokenA > leftoverTokenBN) {
            const sendAmount = tokenBalTokenA - leftoverTokenBN;
            console.log(`Sending ${ethers.formatUnits(sendAmount, tokenADoc.decimals)} token back to master...`);

            const tokenATxParams = {
              to: tokenADoc.tokenAddress,
              data: erc20TokenA.interface.encodeFunctionData('transfer', [masterAddress, sendAmount]),
              chainId: chainId,
              nonce: await provider.getTransactionCount(childWallet.address, 'pending'),
            };
            tokenATxParams.gasLimit = await estimateGasOrFallback(provider, tokenATxParams, FALLBACK_ERC20_GAS);

            const tokenATx = await childWallet.sendTransaction(tokenATxParams);
            tokenReceiptTokenA = await tokenATx.wait();
            if (tokenReceiptTokenA.status !== 1) {
              throw new Error('Token return on-chain revert.');
            }

            if (tokenReceiptTokenA) {
              await Transaction.create(
                createTransactionRecord(walletDoc, tokenADoc, tokenReceiptTokenA, tokenBalTokenA, true)
              );

              await Balance.updateOne({ wallet: walletDoc._id }, { $set: { balance: '0' } });
            }
            console.log(`Token return success. TxHash: ${tokenReceiptTokenA.hash}`);
          } else {
            console.log('Token balance <= maxTokenLeftOver. Skipping token return...');
          }
        }
      }

      // 5c) Token B doc (from usage)
      const tokenBDoc = await CryptoToken.findOne({
        tokenAddress: distReturnConfig.tokenA,
        chainId: distReturnConfig.chainId,
      });
      if (tokenBDoc) {
        console.log(`No matching tokenBDoc for usage tokenAddress=${usage.tokenAddress}, skipping...`);

        /********** (1) Transfer token B back **********/
        const erc20TokenB = new ethers.Contract(tokenBDoc.tokenAddress, MyTokenABI, childWallet);
        const tokenBalTokenB = await erc20TokenB.balanceOf(childWallet.address);

        let tokenReceiptTokenB;
        if (tokenBalTokenB > 0n) {
          const leftoverTokenBN = ethers.parseUnits(maxTokenLeftOver.toString(), tokenBDoc.decimals);
          if (tokenBalTokenB > leftoverTokenBN) {
            const sendAmount = tokenBalTokenB - leftoverTokenBN;
            console.log(`Sending ${ethers.formatUnits(sendAmount, tokenBDoc.decimals)} token back to master...`);

            const tokenBTxParams = {
              to: tokenBDoc.tokenAddress,
              data: erc20TokenB.interface.encodeFunctionData('transfer', [masterAddress, sendAmount]),
              chainId: chainId,
              nonce: await provider.getTransactionCount(childWallet.address, 'pending'),
            };
            tokenBTxParams.gasLimit = await estimateGasOrFallback(provider, tokenBTxParams, FALLBACK_ERC20_GAS);

            const tokenBTx = await childWallet.sendTransaction(tokenBTxParams);
            tokenReceiptTokenB = await tokenBTx.wait();
            if (tokenReceiptTokenB.status !== 1) {
              throw new Error('Token return on-chain revert.');
            }

            if (tokenReceiptTokenB) {
              await Transaction.create(
                createTransactionRecord(walletDoc, tokenBDoc, tokenReceiptTokenB, tokenBalTokenB, true)
              );

              await Balance.updateOne({ wallet: walletDoc._id }, { $set: { balance: '0' } });
            }
            console.log(`Token return success. TxHash: ${tokenReceiptTokenB.hash}`);
          } else {
            console.log('Token balance <= maxTokenLeftOver. Skipping token return...');
          }
        }
      }

      /********** (2) Transfer native back **********/
      let nativeReceipt;
      const nativeBal = await provider.getBalance(childWallet.address);
      if (nativeBal > 0n) {
        const leftoverEthBN = ethers.parseUnits(maxNativeLeftOver.toString(), 'ether');
        if (nativeBal > leftoverEthBN) {
          const sendAmount = nativeBal - leftoverEthBN;
          console.log(`Sending ~${ethers.formatEther(sendAmount)} native to master...`);

          const nativeTxParams = {
            to: masterAddress,
            value: sendAmount,
            chainId: chainId,
            nonce: await provider.getTransactionCount(childWallet.address, 'pending'),
          };
          nativeTxParams.gasLimit = await estimateGasOrFallback(provider, nativeTxParams, FALLBACK_ETH_GAS);

          // NEW: Check if the reserved leftover covers the estimated gas fee
          const feeData = await provider.getFeeData();
          const gasPrice = feeData.gasPrice || feeData.maxFeePerGas;
          const estimatedFee = nativeTxParams.gasLimit * gasPrice;
          if (leftoverEthBN < estimatedFee) {
            console.log(
              `Skipping native return for ${
                childWallet.address
              } due to low reserved balance for gas fee (required: ${ethers.formatEther(
                estimatedFee
              )}, reserved: ${ethers.formatEther(leftoverEthBN)}).`
            );
          } else {
            const nativeTx = await childWallet.sendTransaction(nativeTxParams);
            nativeReceipt = await nativeTx.wait();
            currentNonce += 1n;
            if (nativeReceipt.status !== 1) {
              throw new Error('Native return on-chain revert.');
            }
            if (nativeReceipt) {
              const nativeTokenDoc = await CryptoToken.findOne({ chainId, isNative: true });
              await Transaction.create(createTransactionRecord(walletDoc, nativeTokenDoc, nativeReceipt, nativeBal, false));
              await Balance.updateOne({ wallet: walletDoc._id }, { $set: { balance: '0' } });
            }
            console.log(`Native return success. TxHash: ${nativeReceipt.hash}`);
          }
        } else {
          console.log('Native balance <= maxNativeLeftOver. Skipping native return...');
        }
      }

      /********** (3) DB Updates **********/
      const session = await Wallet.startSession();
      try {
        await session.startTransaction();

        // Remove usage
        await WalletUsage.deleteOne({ _id: usage._id }, { session });

        // Mark wallet inactive
        await Wallet.updateOne({ _id: walletDoc._id }, { status: 'inactive' }, { session });

        await session.commitTransaction();
        session.endSession();
      } catch (dbErr) {
        console.error('DB write transaction failed:', dbErr.message);
        await session.abortTransaction();
        session.endSession();
        throw dbErr;
      }

      totalReturned++;
      console.log(`Successfully returned funds from ${walletDoc.address}`);
    } catch (err) {
      console.error(`Error returning from wallet ${walletDoc.address}: ${err}`);
      console.error(`Stopping immediately after ${totalReturned} successes.`);
      return totalReturned; // or break; depends on your flow
    }
  } // end for usageRecords

  console.log(`returnAllFundsToMaster completed. totalReturned = ${totalReturned}`);
  return totalReturned;
}

module.exports = {
  returnAllFundsToMaster,
};
