const mongoose = require('mongoose');
const Wallet = require('../models/wallet.model');
const { HDNodeWallet } = require('ethers');
const { KMSClient, DecryptCommand } = require('@aws-sdk/client-kms');
const config = require('../config/config');
const WalletTypes = require('../enums/walletTypes');

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
 * @param {string} derivationPath - The base derivation path (e.g., "m/44'/60'/0'/0")
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
 * 1. Decrypting the master seed using the provided derivation path.
 * 2. Retrieving the last used hd_index for the given walletGenerationConfig.
 * 3. Deriving new addresses using a relative derivation path.
 * 4. Saving the new wallet addresses to the database.
 * 5. Creating default balance entries (for the native token) and WalletUsage entries.
 *
 * All DB operations are performed in a transaction. If any error occurs, no data is saved.
 *
 * @param {Object} walletGenConfig - A WalletGenerationConfig document.
 * @returns {number} The number of addresses generated.
 */
const generateAddresses = async (walletGenConfig) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const count = walletGenConfig.count;
    const derivationPath = walletGenConfig.derivation_path;
    // const network = walletGenConfig.network;
    const hdWallet = await getHDWallet(derivationPath);

    // Retrieve the last wallet for this configuration based on hd_index.
    const lastWallet = await Wallet.findOne().sort({ hd_index: -1 }).session(session).lean();
    let lastHdIndex = lastWallet ? lastWallet.hd_index : -1;
    let generatedCount = 0;

    const CryptoToken = require('../models/cryptoToken.model');
    const Balance = require('../models/balance.model');
    const WalletUsage = require('../models/walletUsage.model');

    // Look up the native token record for this network (native tokens have isNative: true).
    //const nativeToken = await CryptoToken.findOne({ network, isNative: true }).session(session);

    // Read seed version from configuration (defaulting to "v1" if not provided) from walletGenConfig.
    //const seedVersion = walletGenConfig.seedVersion;

    for (let i = 0; i < count; i++) {
      const newHdIndex = lastHdIndex + 1 + i;
      // Derive a child wallet using a relative derivation path.
      const child = hdWallet.derivePath(`${newHdIndex}`);
      const address = child.address;

      // Check if this wallet address already exists.
      const existingWallet = await Wallet.findOne({ address }).session(session);
      if (existingWallet) {
        console.warn(`Wallet ${address} already exists; skipping hd_index ${newHdIndex}.`);
        continue;
      }

      // Create the wallet document, linking it to the walletGenerationConfig.
      // const walletDocs =
      await Wallet.create(
        [
          {
            address,
            hd_index: newHdIndex,
            type: newHdIndex == 0 ? WalletTypes.MASTER : WalletTypes.NORMAL,
            walletGenerationConfig: walletGenConfig._id,
            snapshot: {
              derivation_path: derivationPath,
              seedVersion: walletGenConfig.seedVersion,
            },
          },
        ],
        { session }
      );
      //const walletDoc = walletDocs[0];
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
};

module.exports = {
  getHDWallet,
  generateAddresses,
};
