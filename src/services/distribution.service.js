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
  const MAX_TRIES = 100;
  const DECIMAL_PLACES = 8;

  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    let allocations = [];
    let remaining = Number(totalAmount);

    for (let i = 0; i < count; i++) {
      remaining = parseFloat(remaining.toFixed(DECIMAL_PLACES));
      if (i === count - 1) {
        if (remaining < minAmount || remaining > maxAmount) {
          allocations = null;
          break;
        }
        allocations.push(parseFloat(remaining.toFixed(DECIMAL_PLACES)));
      } else {
        const addressesLeft = count - i - 1;
        const maxPossible = Math.min(maxAmount, parseFloat((remaining - minAmount * addressesLeft).toFixed(DECIMAL_PLACES)));
        if (maxPossible < minAmount) {
          allocations = null;
          break;
        }
        let randomAlloc = Math.random() * (maxPossible - minAmount) + minAmount;
        randomAlloc = parseFloat(randomAlloc.toFixed(DECIMAL_PLACES));
        allocations.push(randomAlloc);
        remaining = parseFloat((remaining - randomAlloc).toFixed(DECIMAL_PLACES));
      }
    }
    if (allocations && allocations.length === count) {
      return allocations;
    }
  }
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
  // 1) Basic checks & provider
  const provider = new ethers.JsonRpcProvider(config.rpc.quicknode);
  const chainId = distConfig.pool.chainId.toString();
  const poolId = distConfig.pool._id;
  // 2) Load token docs
  let token;
  if (distConfig.token0) {
    token = await CryptoToken.findById(distConfig.pool.token0);
  } else {
    token = await CryptoToken.findById(distConfig.pool.token1);
  }

  if (!token) {
    console.log('Token doc not found. Cannot distribute.');
    throw new Error('Token doc not found. Cannot distribute.');
  }

  if (distConfig.masterWallet.status !== 'active') {
    console.log('Master wallet is not active. Cannot distribute.');
    throw new Error('Master wallet is not active. Cannot distribute.');
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
    tokenAddress: token.tokenAddress,
    pool: poolId,
  });
  if (existingCount >= activePoolSize) {
    console.log('Sufficient active wallets. Skipping activation.');
    return 0;
  }

  console.log(`Requested wallets: ${activePoolSize}`);
  const targetWallets = await Wallet.aggregate([
    { $match: { type: WalletTypes.NORMAL, status: 'inactive' } },
    { $sample: { size: activePoolSize } },
  ]);
  if (!targetWallets.length) {
    console.log('No inactive wallets found. Stopping.');
    return 0;
  }
  console.log(
    'totalNative, minNative, maxNative, targetWallets.length',
    totalNative,
    minNative,
    maxNative,
    targetWallets.length
  );
  const nativeAllocations = generateRandomAllocations(totalNative, minNative, maxNative, targetWallets.length);
  console.log('totalToken, minToken, maxToken, targetWallets.length', totalToken, minToken, maxToken, targetWallets.length);

  const tokenAllocations = generateRandomAllocations(totalToken, minToken, maxToken, targetWallets.length);

  const masterWallet = await getMasterWallet(provider, distConfig.masterWallet);

  const BATCH_SIZE = 20;
  const batches = [];
  for (let i = 0; i < targetWallets.length; i += BATCH_SIZE) {
    batches.push(targetWallets.slice(i, i + BATCH_SIZE));
  }

  let totalDistributed = 0;
  for (let bIndex = 0; bIndex < batches.length; bIndex++) {
    const batch = batches[bIndex];
    console.log('batch', batch);
    console.log(`Processing batch ${bIndex + 1} of ${batches.length}...`);
    const feeData = await provider.getFeeData();
    const baseFee = feeData.gasPrice != null ? feeData.gasPrice : feeData.maxFeePerGas - feeData.maxPriorityFeePerGas;
    const maxPriorityFeePerGas = ethers.parseUnits(MAX_PRIORITY_FEE_GWEI.toString(), 'gwei');
    let maxFeePerGas = ((baseFee + maxPriorityFeePerGas) * FEE_MULTIPLIER) / 10n;
    if (maxFeePerGas < maxPriorityFeePerGas) {
      maxFeePerGas = maxPriorityFeePerGas * 2n;
    }

    let currentNonce = BigInt(await provider.getTransactionCount(masterWallet.address, 'pending'));

    for (let wIndex = 0; wIndex < batch.length; wIndex++) {
      const wallet = batch[wIndex];
      console.log(`Attempting on-chain distribution for wallet ${wallet.address}...`);

      try {
        const nativeAllocStr = nativeAllocations[totalDistributed].toFixed(8);
        const nativeAmount = ethers.parseEther(nativeAllocStr);

        const feeData = await provider.getFeeData();
        const computedPriorityFee =
          feeData.maxPriorityFeePerGas &&
          feeData.maxPriorityFeePerGas < ethers.parseUnits(MAX_PRIORITY_FEE_GWEI.toString(), 'gwei')
            ? feeData.maxPriorityFeePerGas
            : ethers.parseUnits(MAX_PRIORITY_FEE_GWEI.toString(), 'gwei');

        const computedMaxFee = feeData.maxFeePerGas
          ? (feeData.maxFeePerGas * BigInt(FEE_MULTIPLIER)) / 10n
          : feeData.maxFeePerGas;

        const nativeTxParams = {
          to: wallet.address,
          value: nativeAmount,
          nonce: currentNonce,
          chainId: chainId,
          maxPriorityFeePerGas: computedPriorityFee,
          maxFeePerGas: computedMaxFee,
        };

        const recipientCode = await provider.getCode(wallet.address);
        if (recipientCode === '0x') {
          nativeTxParams.gasLimit = FALLBACK_ETH_GAS;
        } else {
          try {
            const est = await provider.estimateGas(nativeTxParams);
            nativeTxParams.gasLimit = applyGasBuffer(est, FALLBACK_ETH_GAS);
          } catch (err) {
            console.error('Native gas estimation failed:', err.message);
            nativeTxParams.gasLimit = FALLBACK_ETH_GAS;
          }
        }

        const nativeTx = await masterWallet.sendTransaction(nativeTxParams);
        console.log(`Sent ${nativeAllocStr} ETH to ${wallet.address}`);
        const nativeReceipt = await nativeTx.wait();
        currentNonce += 1n;

        await Transaction.create([createTransactionRecord(wallet, null, nativeReceipt, nativeAmount, chainId, poolId)]);

        await Balance.updateOne(
          { wallet: wallet._id, chainId: chainId, isNative: true },
          { $inc: { balance: nativeAmount.toString() } },
          { upsert: true, new: true }
        );

        if (nativeReceipt.status !== 1) {
          throw new Error(`Native transfer to ${wallet.address} reverted on-chain`);
        }

        const erc20Contract = new ethers.Contract(token.tokenAddress, MyTokenABI, masterWallet);

        const tokenAllocVal = tokenAllocations[totalDistributed];
        const tokenAmount = ethers.parseUnits(tokenAllocVal.toString(), token.decimals);

        const tokenTxParams = {
          to: token.tokenAddress,
          data: erc20Contract.interface.encodeFunctionData('transfer', [wallet.address, tokenAmount]),
          nonce: currentNonce,
          chainId: chainId,
          maxPriorityFeePerGas: computedPriorityFee,
          maxFeePerGas: computedMaxFee,
        };

        try {
          const est = await provider.estimateGas(tokenTxParams);
          tokenTxParams.gasLimit = applyGasBuffer(est, FALLBACK_ERC20_GAS);
        } catch (err) {
          console.error('ERC20 gas estimation failed:', err.message);
          tokenTxParams.gasLimit = FALLBACK_ERC20_GAS;
        }

        const tokenTx = await masterWallet.sendTransaction(tokenTxParams);
        console.log(`Sent ${tokenAllocVal} ${token.tokenSymbol} to ${wallet.address}`);

        const tokenReceipt = await tokenTx.wait();
        currentNonce += 1n;

        if (tokenReceipt.status !== 1) {
          throw new Error(`ERC20 transfer to ${wallet.address} reverted on-chain`);
        }

        const miniSession = await Wallet.startSession();
        try {
          await miniSession.startTransaction();

          const existingUsage = await WalletUsage.findOne({
            wallet: wallet._id,
            tokenAddress: token.tokenAddress,
            pool: poolId,
          }).session(miniSession);

          if (!existingUsage) {
            await WalletUsage.create(
              [
                {
                  wallet: wallet._id,
                  chainId: chainId,
                  tokenAddress: token.tokenAddress,
                  pool: poolId,
                  hd_index: wallet.hd_index,
                  address: wallet.address,
                },
              ],
              { session: miniSession }
            );
          }

          await Wallet.updateOne({ _id: wallet._id }, { status: 'active' }, { session: miniSession });

          await Balance.updateOne(
            { wallet: wallet._id, token: token._id },
            { $inc: { balance: tokenAmount.toString() } },
            { session: miniSession, upsert: true, new: true }
          );
          await Transaction.create([createTransactionRecord(wallet, token, tokenReceipt, tokenAmount, chainId, poolId)], {
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
        console.error(`Stopping immediately after ${totalDistributed} successful wallet(s).`);
        return totalDistributed;
      }
    }
  }

  console.log(`Distribution completed successfully. Total distributed: ${totalDistributed}`);
  return totalDistributed;
}

module.exports = {
  distributeToActiveWallets,
};
