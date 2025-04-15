const mongoose = require('mongoose');
const Wallet = require('../models/wallet.model');
const WalletTypes = require('../enums/walletTypes');
const WalletGenerationConfig = require('../models/walletGenerationConfig.model');
const { HDNodeWallet } = require('ethers');
const { KMSClient, DecryptCommand } = require('@aws-sdk/client-kms');
const config = require('../config/config');
const kms = new KMSClient({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
});

/**
 * Decrypts the master seed stored in config.aws.encryptedMasterSeed using AWS KMS,
 * and creates an HD wallet from the decrypted seed using the provided derivation path.
 * @param {string} derivationPath - The base derivation path (e.g. "m/44'/60'/0'/0")
 * @returns {Promise<HDNodeWallet>} An HD wallet instance from ethers v6.
 */
async function getHDWallet(derivationPath) {
  const encryptedSeed = config.aws.encryptedMasterSeed;
  if (!encryptedSeed) {
    throw new Error('ENCRYPTED_MASTER_SEED is not defined in configuration.');
  }

  const decryptCommand = new DecryptCommand({
    CiphertextBlob: Buffer.from(encryptedSeed, 'base64'),
    KeyId: config.aws.kmsKeyId,
  });

  const { Plaintext } = await kms.send(decryptCommand);

  // For testing only: log the decrypted seed in base64 format.
  console.log('Decrypted seed (base64):', Buffer.from(Plaintext).toString('base64'));

  // Create an HD wallet from the decrypted seed using the provided derivation path.
  const hdWallet = HDNodeWallet.fromSeed(Plaintext, derivationPath);
  return hdWallet;
}

/**
 * Generates new child addresses for a given WalletGenerationConfig record by:
 * 1. Decrypting the master seed with the provided derivation path.
 * 2. Retrieving the last used hd_index for the given walletGenerationConfig.
 * 3. Deriving new addresses using a relative path.
 * 4. Saving the new wallet addresses to the database.
 * 5. Creating default balance entries, etc.
 *
 * All DB operations are performed in a transaction. If any error occurs, the transaction is aborted.
 *
 * @param {Object} walletGenConfig - A WalletGenerationConfig document.
 * @returns {number} The number of addresses generated.
 */
async function generateAddresses(walletGenConfig) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const count = walletGenConfig.count;
    const derivationPath = walletGenConfig.derivation_path;
    const hdWallet = await getHDWallet(derivationPath);

    // Find the last wallet in the DB for this config, by hd_index descending.
    const lastWallet = await Wallet.findOne().sort({ hd_index: -1 }).session(session).lean();
    let lastHdIndex = lastWallet ? lastWallet.hd_index : -1;
    let generatedCount = 0;

    const CryptoToken = require('../models/cryptoToken.model');
    const Balance = require('../models/balance.model');
    const WalletUsage = require('../models/walletUsage.model');

    for (let i = 0; i < count; i++) {
      const newHdIndex = lastHdIndex + 1 + i;
      // Derive the child using just the index appended (e.g. "m/44'/60'/0'/0/x").
      const child = hdWallet.derivePath(`${newHdIndex}`);
      const address = child.address;

      // Check if the wallet address already exists in DB.
      const existingWallet = await Wallet.findOne({ address }).session(session);
      if (existingWallet) {
        console.warn(`Wallet ${address} already exists; skipping hd_index ${newHdIndex}.`);
        continue;
      }

      // Create a new wallet doc
      await Wallet.create(
        [
          {
            address,
            hd_index: newHdIndex,
            type: newHdIndex === 0 ? WalletTypes.MASTER : WalletTypes.NORMAL,
            walletGenerationConfig: walletGenConfig._id,
            snapshot: {
              derivation_path: derivationPath,
              seedVersion: walletGenConfig.seedVersion,
            },
          },
        ],
        { session }
      );
      generatedCount++;
    }

    await session.commitTransaction();
    session.endSession();
    console.log(
      `${generatedCount} addresses generated for config ${walletGenConfig._id} starting from index ${lastHdIndex + 1}.`
    );
    return generatedCount;
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    console.error('Error generating addresses for config:', error);
    throw error;
  }
}

/**
 * Returns the "gas station" wallet used for refilling native tokens.
 */
async function getGasStationWallet() {
  const gasStationWallet = await Wallet.findOne({ status: 'active', type: WalletTypes.GAS_STATION }).lean();
  if (!gasStationWallet) {
    throw new Error('Gas station wallet not found');
  }
  return gasStationWallet;
}

/**
 * Looks up a wallet record by address and returns its DB _id. Throws if not found.
 */
async function getWalletIdByAddress(walletAddress) {
  const wallet = await Wallet.findOne({ address: walletAddress });
  if (!wallet) {
    throw new Error('Wallet not found');
  }
  return wallet.id;
}

/**
 * Returns an HD-derived wallet by re-deriving from the master seed based on the wallet's hd_index and config.
 * 1. Looks up the associated WalletGenerationConfig record to get the base derivation path
 * 2. Decrypts + loads the HD wallet
 * 3. Derives the child path from `wallet.hd_index`
 */
async function getDerivedWallet(wallet) {
  const genConfig = await WalletGenerationConfig.findById(wallet.walletGenerationConfig);
  if (!genConfig) {
    throw new Error('Wallet generation config not found: ' + wallet._id);
  }
  const hdWallet = await getHDWallet(genConfig.derivation_path);
  return hdWallet.derivePath(`${wallet.hd_index}`);
}

module.exports = {
  getHDWallet,
  generateAddresses,
  getGasStationWallet,
  getWalletIdByAddress,
  getDerivedWallet,
};
