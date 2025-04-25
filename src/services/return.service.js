const { ethers } = require('ethers');
const config = require('../config/config');
const WalletGenerationConfig = require('../models/walletGenerationConfig.model');
const { getHDWallet } = require('./wallet.service');
const Wallet = require('../models/wallet.model');
const WalletUsage = require('../models/walletUsage.model');
const Transaction = require('../models/transaction.model');
const Balance = require('../models/balance.model');
const CryptoToken = require('../models/cryptoToken.model');
const MyTokenABI = require('../config/abis/TrumpToken.json');
const WalletTypes = require('../enums/walletTypes');
const TxnStatus = require('../enums/txnStatus');

// Gas config
const GAS_BUFFER_PERCENTAGE = 20n;
const FALLBACK_ETH_GAS = 21000n;
const FALLBACK_ERC20_GAS = 100000n;

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
function createTransactionRecord(wallet, token, receipt, amount, chainId, poolId) {
  return {
    wallet: wallet._id,
    token: token ? token._id : null,
    amount: amount.toString(),
    chainId: chainId,
    transactionHash: receipt.hash,
    status: receipt.status === 1 ? TxnStatus.SUCCESS : TxnStatus.FAILED,
    poolId: poolId,
  };
}

/**
 * Utility for applying gas buffer or fallback
 */
async function estimateGasOrFallback(provider, txParams, fallback) {
  try {
    const est = await provider.estimateGas(txParams);
    console.log('Estimated gas estimateGasOrFallback:', est.toString());
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
  const provider = new ethers.JsonRpcProvider(config.rpc.quicknode);
  const chainId = distReturnConfig.chainId;
  const poolId = distReturnConfig.pool._id;
  const masterWalletDoc = await Wallet.findById(distReturnConfig.masterWallet);
  if (!masterWalletDoc) {
    console.log('Master wallet doc not found in distReturnConfig. Stopping...');
    return 0;
  }
  const derivedMaster = await getDerivedWallet(masterWalletDoc);
  const masterAddress = derivedMaster.connect(provider).address;

  let token;
  if (distReturnConfig.token0) {
    token = await CryptoToken.findById(distReturnConfig.pool.token0);
  } else {
    token = await CryptoToken.findById(distReturnConfig.pool.token1);
  }
  const maxNativeLeftOver = distReturnConfig.maxNativeLeftOver.toString() || '0';
  const maxTokenLeftOver = distReturnConfig.maxTokenLeftOver.toString() || '0';

  const usageRecords = await WalletUsage.find({ chainId }).populate('wallet');
  if (!usageRecords.length) {
    console.log('No active usage records found. Nothing to return.');
    return 0;
  }
  let totalReturned = 0;
  for (const usage of usageRecords) {
    const walletDoc = usage.wallet;
    console.log(`Processing wallet ${walletDoc.address}...`);
    if (walletDoc && walletDoc.type === WalletTypes.NORMAL) {
      console.log(`Returning funds from wallet ${walletDoc.address} -> master ${masterAddress}`);
      try {
        const childDerived = await getDerivedWallet(walletDoc);
        const childWallet = childDerived.connect(provider);

        if (token) {
          const erc20TokenA = new ethers.Contract(token.tokenAddress, MyTokenABI, childWallet);
          const tokenBalTokenA = await erc20TokenA.balanceOf(childWallet.address);

          let tokenReceiptTokenA;
          if (tokenBalTokenA > 0n) {
            const decimalString = convertSciToDecimal(maxTokenLeftOver);
            const leftoverTokenBN = ethers.parseUnits(decimalString, 'ether');
            if (tokenBalTokenA > leftoverTokenBN) {
              const sendAmount = tokenBalTokenA - leftoverTokenBN;
              console.log(`Sending ${ethers.formatUnits(sendAmount, token.decimals)} token back to master...`);

              const tokenATxParams = {
                to: token.tokenAddress,
                data: erc20TokenA.interface.encodeFunctionData('transfer', [masterAddress, sendAmount]),
                chainId: chainId,
                nonce: await provider.getTransactionCount(childWallet.address, 'pending'),
              };
              tokenATxParams.gasLimit = await estimateGasOrFallback(provider, tokenATxParams, FALLBACK_ERC20_GAS);

              try {
                const tokenATx = await childWallet.sendTransaction(tokenATxParams);
                tokenReceiptTokenA = await tokenATx.wait();
              } catch (err) {
                console.error('Error sending native transaction:', err);
                continue;
              }

              // if (tokenReceiptTokenA.status !== 1) {
              //   console.log('Token return failed for address:', childWallet.address);
              //   continue;
              // }

              if (tokenReceiptTokenA) {
                await Transaction.create(
                  createTransactionRecord(walletDoc, token, tokenReceiptTokenA, tokenBalTokenA, chainId, poolId)
                );

                await Balance.updateOne({ wallet: walletDoc._id }, { $set: { balance: '0' } });
              }
              console.log(`Token return success. TxHash: ${tokenReceiptTokenA.hash}`);
            } else {
              console.log('Token balance <= maxTokenLeftOver. Skipping token return...');
            }
          }
        }

        let nativeReceipt;
        const nativeBal = await provider.getBalance(childWallet.address);
        if (nativeBal > 0n) {
          const decimalString = convertSciToDecimal(maxNativeLeftOver);
          const leftoverEthBN = ethers.parseUnits(decimalString, 'ether');
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

            const feeData = await provider.getFeeData();
            const gasPrice = feeData.maxFeePerGas || feeData.gasPrice;
            const estimatedFee = nativeTxParams.gasLimit * gasPrice;
            let amountAfterGas = sendAmount - estimatedFee;
            if (amountAfterGas < estimatedFee) {
              console.log(
                `Skipping native return for ${
                  childWallet.address
                } due to low reserved balance for gas fee (required: ${ethers.formatEther(
                  estimatedFee
                )}, reserved left over Eth: ${ethers.formatEther(leftoverEthBN)}) and balance: ${ethers.formatEther(
                  nativeBal
                )}`
              );
              // TODO:filter by chainId also
              await Balance.updateOne({ wallet: walletDoc._id }, { $set: { balance: leftoverEthBN.toString() } });
            } else {
              //TODO: Record Transaction

              nativeTxParams.value = amountAfterGas;
              nativeTxParams.gasPrice = gasPrice;
              console.log('Native TxParams amountAfterGas:', nativeTxParams);
              try {
                const nativeTx = await childWallet.sendTransaction(nativeTxParams);
                nativeReceipt = await nativeTx.wait();
              } catch (err) {
                console.error('Error sending native transaction:', err);
                continue;
              }

              //TODO: Update Transaction
              // if (nativeReceipt.status !== 1) {
              //   console.log('Native return failed for address:', childWallet.address);
              //   continue;
              // }
              if (nativeReceipt) {
                //TODO:Remove this everytime call
                const nativeTokenDoc = await CryptoToken.findOne({ chainId, isNative: true });
                await Transaction.create(
                  createTransactionRecord(walletDoc, nativeTokenDoc, nativeReceipt, nativeBal, chainId, poolId)
                );
                await Balance.updateOne({ wallet: walletDoc._id }, { $set: { balance: '0' } });
              }
              console.log(`Native return success. TxHash: ${nativeReceipt.hash}`);
            }
          } else {
            console.log('Native balance <= maxNativeLeftOver. Skipping native return...');
            // TODO:filter by chainId also
            await Balance.updateOne({ wallet: walletDoc._id }, { $set: { balance: '0' } });
          }
        }

        const session = await Wallet.startSession();
        try {
          await session.startTransaction();

          await WalletUsage.deleteOne({ _id: usage._id }, { session });

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
        return totalReturned;
      }
    } else {
      console.log(`Wallet ${walletDoc.address} is not a normal wallet. Skipping...`);
    }
  }
  console.log(`returnAllFundsToMaster completed. totalReturned = ${totalReturned}`);
  return totalReturned;
}

function convertSciToDecimal(value) {
  const str = String(value).trim().toLowerCase();
  if (!str.includes('e')) return str;
  const [mantissa, exponent] = str.split('e');
  const exp = parseInt(exponent, 10);
  const [intPart, fracPart = ''] = mantissa.split('.');
  const digits = intPart + fracPart;
  const digitsLength = digits.length;
  if (exp < 0) {
    const decimalPlaces = Math.abs(exp);
    const paddedDigits = digits.padStart(decimalPlaces, '0');
    return `0.${paddedDigits.slice(0, -digitsLength)}${digits}`.replace(/0+$/, '');
  }
  return digits + '0'.repeat(exp - fracPart.length);
}

module.exports = {
  returnAllFundsToMaster,
};
