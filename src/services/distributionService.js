const { ethers } = require('ethers');
const config = require('../config/config');
const WalletGenerationConfig = require('../models/walletGenerationConfig.model');
const { getHDWallet } = require('./walletService');
const Wallet = require('../models/wallet.model');
const WalletUsage = require('../models/walletUsage.model');
const Transaction = require('../models/transaction.model');
const Balance = require('../models/balance.model');
const CryptoToken = require('../models/cryptoToken.model');
const MyTokenABI = require('../config/abis/MyToken.json');

// Gas configuration
const GAS_BUFFER_PERCENTAGE = 20n;
const MAX_PRIORITY_FEE_GWEI = 3n;
const FEE_MULTIPLIER = 15n; // 1.5x multiplier (15/10 = 1.5)
const FALLBACK_ETH_GAS = 21000n;
const FALLBACK_ERC20_GAS = 100000n;

/**
 * Derive a wallet from your HD wallet data.
 */
async function getDerivedWallet(wallet) {
  const genConfig = await WalletGenerationConfig.findById(wallet.walletGenerationConfig);
  if (!genConfig) throw new Error('Wallet generation config not found: ' + wallet._id);
  const hdWallet = await getHDWallet(genConfig.derivation_path);
  return hdWallet.derivePath(`${wallet.hd_index}`);
}

/**
 * Fetch your master wallet from DB, derive its private key, and connect it to the given provider.
 */
async function getMasterWallet(provider, masterWalletId) {
  if (!masterWalletId) {
    throw new Error('No master wallet ID provided');
  }
  const masterWalletDoc = await Wallet.findById(masterWalletId);
  if (!masterWalletDoc) throw new Error('Master wallet not found');
  const derivedWallet = await getDerivedWallet(masterWalletDoc);
  return derivedWallet.connect(provider);
}

/**
 * Create transaction record for the Transaction collection
 */
function createTransactionRecord(wallet, token, receipt, amount, isERC20 = false) {
  return {
    wallet: wallet._id,
    token: token._id,
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
 * Apply a gas buffer to an estimated amount, or fall back to a default if something fails.
 */
function applyGasBuffer(estimatedGas, fallback) {
  try {
    return (estimatedGas * (100n + GAS_BUFFER_PERCENTAGE)) / 100n;
  } catch (error) {
    console.error('Failed to apply gas buffer, using fallback:', fallback);
    return fallback;
  }
}

/**
 * Helper: Generate an array of random allocations summing exactly to totalAmount.
 * - Each allocation is between [minAmount, maxAmount].
 * - For the first (count - 1) addresses, pick a random value that leaves
 *   enough for the remaining addresses to each get at least minAmount.
 * - The last address gets the remaining leftover, ensuring an exact sum.
 * - If leftover for the last address is outside [minAmount, maxAmount], throw an error.
 */
function generateRandomAllocations(totalAmount, minAmount, maxAmount, count) {
  const MAX_TRIES = 10;

  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    let allocations = [];
    let remaining = Number(totalAmount);

    for (let i = 0; i < count; i++) {
      if (i === count - 1) {
        // Last wallet gets leftover
        if (remaining < minAmount || remaining > maxAmount) {
          // This attempt fails; break out & try again
          allocations = null;
          break;
        }
        allocations.push(parseFloat(remaining.toFixed(8)));
      } else {
        const addressesLeft = count - i - 1;
        const maxPossible = Math.min(maxAmount, remaining - minAmount * addressesLeft);
        if (maxPossible < minAmount) {
          // This attempt fails; break out
          allocations = null;
          break;
        }
        let randomAlloc = Math.random() * (maxPossible - minAmount) + minAmount;
        randomAlloc = parseFloat(randomAlloc.toFixed(8));
        allocations.push(randomAlloc);
        remaining -= randomAlloc;
      }
    }

    if (allocations && allocations.length === count) {
      // We succeeded in building a valid distribution; return it
      return allocations;
    }
    // Otherwise, loop again and try another attempt
  }

  // If we reach here, no valid distribution was found within MAX_TRIES
  throw new Error('Cannot generate a valid distribution after multiple attempts.');
}

/**
 * distributeToActiveWallets
 *
 * 1) Ensure we match the chainId.
 * 2) Validate that the total allocated (native + token) plus min/max constraints
 *    allow for exact distribution among activePoolSize addresses.
 * 3) Check how many usage records exist. If already enough, skip.
 * 4) Randomly pick the needed number of inactive wallets from DB.
 * 5) Generate arrays of random allocations (native & token) that sum to the total amounts.
 * 6) Do on-chain distribution for each wallet, stopping on the first failure.
 * 7) For each success, do a short DB transaction (usage + status + balances + transactions).
 */
async function distributeToActiveWallets(distConfig) {
  try {
    // 1) Basic checks & provider
    const provider = new ethers.JsonRpcProvider(config.rpc.quicknode);
    const networkInfo = await provider.getNetwork();
    const chainId = networkInfo.chainId.toString();

    if (distConfig.token.chainId.toString() !== chainId) {
      throw new Error(`Chain ID mismatch: Config ${distConfig.token.chainId} vs Network ${chainId}`);
    }

    // 2) Load token docs
    const tokenDoc = await CryptoToken.findById(distConfig.token);
    if (!tokenDoc) {
      console.log('Token doc not found. Cannot distribute.');
      return 0;
    }
    const nativeTokenDoc = await CryptoToken.findOne({
      chainId: distConfig.token.chainId,
      isNative: true,
    });
    if (!nativeTokenDoc) {
      console.log('Native token doc not found. Cannot distribute.');
      return 0;
    }

    // 3) Validate distribution amounts & min/max constraints
    const totalNative = Number(distConfig.nativeDistributionAmount);
    const totalToken = Number(distConfig.tokenDistributionAmount);
    const minNative = Number(distConfig.minNativeDistributionAmount);
    const maxNative = Number(distConfig.maxNativeDistributionAmount);
    const minToken = Number(distConfig.minTokenDistributionAmount);
    const maxToken = Number(distConfig.maxTokenDistributionAmount);
    const activePoolSize = distConfig.activePoolSize;

    // Check if total fits into min/max constraints
    if (activePoolSize * minNative > totalNative || activePoolSize * maxNative < totalNative) {
      throw new Error('Native distribution range does not allow full exhaustion of the allocated amount.');
    }
    if (activePoolSize * minToken > totalToken || activePoolSize * maxToken < totalToken) {
      throw new Error('Token distribution range does not allow full exhaustion of the allocated amount.');
    }

    // Count existing usage records
    const existingCount = await WalletUsage.countDocuments({
      tokenAddress: tokenDoc.tokenAddress,
      pairAddress: tokenDoc.pairAddress,
    });
    if (existingCount >= activePoolSize) {
      console.log('Sufficient active wallets. Skipping activation.');
      return 0;
    }

    // 4) Randomly pick the needed number of inactive wallets
    console.log(`Requested wallets: ${activePoolSize}`);
    const targetWallets = await Wallet.aggregate([
      { $match: { is_master: false, status: 'inactive' } },
      { $sample: { size: activePoolSize } },
    ]);
    if (!targetWallets.length) {
      console.log('No inactive wallets found. Stopping.');
      return 0;
    }

    // 5) Generate random allocations that sum exactly to the total amounts
    const nativeAllocations = generateRandomAllocations(totalNative, minNative, maxNative, targetWallets.length);
    const tokenAllocations = generateRandomAllocations(totalToken, minToken, maxToken, targetWallets.length);

    // 6) On-chain distribution
    const masterWallet = await getMasterWallet(provider, distConfig.masterWallet);

    // Keep the existing BATCH_SIZE logic for your flow
    const BATCH_SIZE = 3;
    const batches = [];
    for (let i = 0; i < targetWallets.length; i += BATCH_SIZE) {
      batches.push(targetWallets.slice(i, i + BATCH_SIZE));
    }

    let totalDistributed = 0;
    for (let bIndex = 0; bIndex < batches.length; bIndex++) {
      const batch = batches[bIndex];
      console.log(`Processing batch ${bIndex + 1} of ${batches.length}...`);

      // Fresh fee data for each batch
      const feeData = await provider.getFeeData();
      const baseFee = feeData.gasPrice != null ? feeData.gasPrice : feeData.maxFeePerGas - feeData.maxPriorityFeePerGas;
      const maxPriorityFeePerGas = ethers.parseUnits(MAX_PRIORITY_FEE_GWEI.toString(), 'gwei');
      let maxFeePerGas = ((baseFee + maxPriorityFeePerGas) * FEE_MULTIPLIER) / 10n;
      if (maxFeePerGas < maxPriorityFeePerGas) {
        maxFeePerGas = maxPriorityFeePerGas * 2n;
      }

      let currentNonce = BigInt(await provider.getTransactionCount(masterWallet.address, 'pending'));

      // Loop through each wallet in the batch
      for (let wIndex = 0; wIndex < batch.length; wIndex++) {
        const wallet = batch[wIndex];
        console.log(`Attempting on-chain distribution for wallet ${wallet.address}...`);

        try {
          // ---------- (A) Native Transfer ----------
          // Convert allocation to a fixed decimal string to avoid scientific notation
          const nativeAllocStr = nativeAllocations[totalDistributed].toFixed(8);
          const nativeAmount = ethers.parseEther(nativeAllocStr);

          const nativeTxParams = {
            to: wallet.address,
            value: nativeAmount,
            nonce: currentNonce,
            chainId: networkInfo.chainId,
            maxPriorityFeePerGas,
            maxFeePerGas,
          };

          try {
            const est = await provider.estimateGas(nativeTxParams);
            nativeTxParams.gasLimit = applyGasBuffer(est, FALLBACK_ETH_GAS);
          } catch (err) {
            console.error('Native gas estimation failed:', err.message);
            nativeTxParams.gasLimit = FALLBACK_ETH_GAS;
          }

          const nativeTx = await masterWallet.sendTransaction(nativeTxParams);
          console.log(`Sent ${nativeAllocStr} ETH to ${wallet.address}`);
          const nativeReceipt = await nativeTx.wait();
          currentNonce += 1n;

          if (nativeReceipt.status !== 1) {
            throw new Error(`Native transfer to ${wallet.address} reverted on-chain`);
          }

          // ---------- (B) ERC20 Token Transfer ----------
          const erc20Contract = new ethers.Contract(tokenDoc.tokenAddress, MyTokenABI, masterWallet);
          const tokenAllocVal = tokenAllocations[totalDistributed];
          const tokenAmount = ethers.parseUnits(tokenAllocVal.toString(), tokenDoc.decimals);

          const tokenTxParams = {
            to: tokenDoc.tokenAddress,
            data: erc20Contract.interface.encodeFunctionData('transfer', [wallet.address, tokenAmount]),
            nonce: currentNonce,
            chainId: networkInfo.chainId,
            maxPriorityFeePerGas,
            maxFeePerGas,
          };

          try {
            const est = await provider.estimateGas(tokenTxParams);
            tokenTxParams.gasLimit = applyGasBuffer(est, FALLBACK_ERC20_GAS);
          } catch (err) {
            console.error('ERC20 gas estimation failed:', err.message);
            tokenTxParams.gasLimit = FALLBACK_ERC20_GAS;
          }

          const tokenTx = await masterWallet.sendTransaction(tokenTxParams);
          console.log(`Sent ${tokenAllocVal} ${tokenDoc.tokenSymbol} to ${wallet.address}`);
          const tokenReceipt = await tokenTx.wait();
          currentNonce += 1n;

          if (tokenReceipt.status !== 1) {
            throw new Error(`ERC20 transfer to ${wallet.address} reverted on-chain`);
          }

          // ---------- (C) Short DB Transaction ----------
          const miniSession = await Wallet.startSession();
          try {
            await miniSession.startTransaction();

            // Insert usage if needed
            const existingUsage = await WalletUsage.findOne({
              wallet: wallet._id,
              tokenAddress: tokenDoc.tokenAddress,
              pairAddress: tokenDoc.pairAddress,
            }).session(miniSession);

            if (!existingUsage) {
              await WalletUsage.create(
                [
                  {
                    wallet: wallet._id,
                    chainId: networkInfo.chainId,
                    tokenAddress: tokenDoc.tokenAddress,
                    pairAddress: tokenDoc.pairAddress,
                    hd_index: wallet.hd_index,
                    address: wallet.address,
                  },
                ],
                { session: miniSession }
              );
            }

            // Mark wallet as active
            await Wallet.updateOne({ _id: wallet._id }, { status: 'active' }, { session: miniSession });

            // Update balances, insert transaction logs
            await Balance.updateOne(
              { wallet: wallet._id, token: nativeTokenDoc._id },
              { $inc: { balance: nativeAmount.toString() } },
              { session: miniSession, upsert: true }
            );
            await Transaction.create([createTransactionRecord(wallet, nativeTokenDoc, nativeReceipt, nativeAmount)], {
              session: miniSession,
            });

            await Balance.updateOne(
              { wallet: wallet._id, token: tokenDoc._id },
              { $inc: { balance: tokenAmount.toString() } },
              { session: miniSession, upsert: true }
            );
            await Transaction.create([createTransactionRecord(wallet, tokenDoc, tokenReceipt, tokenAmount, true)], {
              session: miniSession,
            });

            await miniSession.commitTransaction();
            miniSession.endSession();

            totalDistributed++;
            console.log(`Wallet ${wallet.address} successfully activated & funded.`);
          } catch (dbErr) {
            console.error('DB write transaction failed:', dbErr.message);
            await miniSession.abortTransaction();
            miniSession.endSession();
            throw dbErr;
          }
        } catch (onChainErr) {
          // If any error (on-chain or DB), stop distribution entirely
          console.error(`Error distributing to wallet ${wallet.address}: ${onChainErr.message}`);
          console.error(`Stopping immediately after ${totalDistributed} successful wallet(s).`);
          return totalDistributed;
        }
      }
    }

    // Completed all addresses without major error
    console.log(`Distribution completed successfully. Total distributed: ${totalDistributed}`);
    return totalDistributed;
  } catch (outerError) {
    console.error('Uncaught error in distributeToActiveWallets:', outerError.message);
    return 0;
  }
}

module.exports = {
  distributeToActiveWallets,
};
