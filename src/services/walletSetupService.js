const dotenv = require('dotenv');
dotenv.config();
const { KMSClient, EncryptCommand, DecryptCommand } = require("@aws-sdk/client-kms");
const bip39 = require("bip39");
const EncryptedSeed = require('../models/encryptedSeed.model');

// Initialize AWS KMS client using credentials from .env
const kms = new KMSClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Sets up a new wallet:
 * - Generates a random mnemonic.
 * - Converts the mnemonic to a seed.
 * - Encrypts the seed using AWS KMS.
 * - Saves the encrypted seed along with the derivation path and nextIndex into the DB.
 */
async function setupWallet() {
  // Generate a random mnemonic phrase.
  const mnemonic = bip39.generateMnemonic();
  // Convert mnemonic to a binary seed.
  const seed = await bip39.mnemonicToSeed(mnemonic);
  
  // Encrypt the seed using AWS KMS.
  const encryptCommand = new EncryptCommand({
    KeyId: process.env.KMS_KEY_ID,
    Plaintext: seed,
  });
  const { CiphertextBlob } = await kms.send(encryptCommand);
  const encryptedSeedBase64 = Buffer.from(CiphertextBlob).toString("base64");
  
  // Save the encrypted seed and configuration to the database.
  const doc = new EncryptedSeed({
    encryptedSeed: encryptedSeedBase64,
    derivationPath: "m/44'/60'/0'/0",
    nextIndex: 0,
    mnemonic, // Remove this field in production!
  });
  
  await doc.save();
  console.log("Wallet setup complete and saved to DB.");
}

/**
 * Retrieves the wallet seed by decrypting the stored encrypted seed.
 * Returns an object containing the decrypted seed (Buffer), derivation path, and nextIndex.
 */
async function getWalletSeed() {
  // Retrieve the encrypted seed document from the DB.
  const doc = await EncryptedSeed.findOne({});
  if (!doc) {
    throw new Error("No encrypted seed found in the database.");
  }
  
  // Decrypt the seed using AWS KMS.
  const decryptCommand = new DecryptCommand({
    CiphertextBlob: Buffer.from(doc.encryptedSeed, "base64"),
    KeyId: process.env.KMS_KEY_ID,
  });
  const { Plaintext } = await kms.send(decryptCommand);
  
  return {
    seed: Plaintext, // This is a Buffer
    derivationPath: doc.derivationPath,
    nextIndex: doc.nextIndex,
  };
}

module.exports = {
  setupWallet,
  getWalletSeed,
};
