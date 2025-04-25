const { generateAddresses } = require('./wallet.service');

/**
 * Generates wallet addresses based on the wallet generation configuration.
 * Returns the number of addresses generated.
 * @param {Object} config - A WalletGenerationConfig document.
 */
async function generateWalletsForConfig(config) {
  const generatedCount = await generateAddresses(config);
  return generatedCount;
}

module.exports = {
  generateWalletsForConfig,
};
