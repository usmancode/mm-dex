const mongoose = require('mongoose');
const config = require('../src/config/config'); // Adjust path as needed
const CryptoToken = require('../src/models/cryptoToken.model');
const DistReturnConfig = require('../src/models/distReturnConfig.model');
const WalletGenerationConfig = require('../src/models/walletGenerationConfig.model');
const SchedulerConfig = require('../src/models/schedulerConfig.model');
const SchedulerTypes = require('../src/config/schedulerTypes');

async function seedDefaultEntries() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongoose.url, {});
    console.log('Connected to MongoDB for seeding default entries.');

    // ----- Seed default entry for CryptoToken (Ethereum native token and market token) -----
    // Ethereum market token (example: XYZ)

    // Ethereum native token (e.g., ETH)
    let nativeTokenEth = await CryptoToken.findOne({ network: 'ETHEREUM', isNative: true });
    if (!nativeTokenEth) {
      nativeTokenEth = new CryptoToken({
        tokenSymbol: 'SepoliaETH',
        tokenAddress: null, // Native token does not have a contract address
        chainId: '11155111',
        network: 'ETHEREUM-TEST',
        isNative: true,
        decimals: 18,
      });
      await nativeTokenEth.save();
      console.log('Default native crypto token (ETH) created.');
    } else {
      console.log('Default native crypto token (ETH) already exists.');
    }

    // ----- Seed default entry for CryptoToken (BSC native token) -----
    let nativeTokenBsc = await CryptoToken.findOne({ network: 'BSC', isNative: true });
    if (!nativeTokenBsc) {
      nativeTokenBsc = new CryptoToken({
        tokenSymbol: 'MATIC',
        tokenAddress: null, // Native token for BSC
        chainId: '0x13881', // Using chainId 97 for testnet BSC; adjust if needed for mainnet
        network: 'Polygin-Mumbai',
        isNative: true,
        decimals: 18,
      });
      await nativeTokenBsc.save();
      console.log('Default native crypto token (BNB) for BSC created.');
    } else {
      console.log('Default native crypto token (BNB) for BSC already exists.');
    }

    let token = await CryptoToken.findOne({ network: 'BSC', isNative: true });
    if (!token) {
      token = new CryptoToken({
        tokenSymbol: 'MTK',
        tokenAddress: '0x91E8daA5e3ae574fF5343E4177876844189beEE9',
        chainId: '11155111',
        network: 'ETHEREUM-TEST',
        isNative: true,
        decimals: 18,
      });
      await token.save();
      console.log('Default native crypto token (token) for token created.');
    } else {
      console.log('Default native crypto token (token) for token already exists.');
    }

    // Suppose you import DistReturnConfig, the token doc, and a masterWallet doc from somewhere
    // e.g. const DistReturnConfig = require('../models/distReturnConfig.model');

    // ----- Seed default entry for DistReturnConfig (Ethereum) -----
    let distReturnConfig1 = await DistReturnConfig.findOne({ network: 'ETHEREUM' });
    if (!distReturnConfig1) {
      distReturnConfig1 = new DistReturnConfig({
        nativeDistributionAmount: 0.00005,
        tokenDistributionAmount: 40,
        minNativeDistributionAmount: 0.0000001,
        maxNativeDistributionAmount: 0.00001,
        minTokenDistributionAmount: 1,
        maxTokenDistributionAmount: 5,
        token: token._id,
        chainId: '11155111',
        activePoolSize: 10,
        expireAt: new Date('2025-12-31T23:59:59Z'),
        network: 'ETHEREUM',
      });
      await distReturnConfig1.save();
      console.log('Default distReturnConfig for ETH created.');
    } else {
      console.log('Default distReturnConfig for ETH already exists.');
    }

    // ----- Seed default entry for DistReturnConfig (BSC) -----
    let distReturnConfig2 = await DistReturnConfig.findOne({ network: 'BSC' });
    if (!distReturnConfig2) {
      distReturnConfig2 = new DistReturnConfig({
        nativeDistributionAmount: 0.000001,
        tokenDistributionAmount: 100,
        minNativeDistributionAmount: 0.0000001,
        maxNativeDistributionAmount: 0.00001,
        minTokenDistributionAmount: 1,
        maxTokenDistributionAmount: 5,
        token: token._id,
        chainId: '0x13881',
        activePoolSize: 100,
        expireAt: new Date('2025-12-31T23:59:59Z'),
        network: 'BSC',
      });
      await distReturnConfig2.save();
      console.log('Default distReturnConfig for BSC created.');
    } else {
      console.log('Default distReturnConfig for BSC already exists.');
    }

    // ----- Seed default entry for WalletGenerationConfig (Ethereum) -----
    let walletGenConfig1 = await WalletGenerationConfig.findOne({ network: 'ETHEREUM' });
    if (!walletGenConfig1) {
      walletGenConfig1 = new WalletGenerationConfig({
        count: 5, // Example: generate 5 addresses per run
        derivation_path: "m/44'/60'/0'/0",
        enabled: true,
        seedVersion: 'v1',
      });
      await walletGenConfig1.save();
      console.log('Default wallet generation config for walletGenConfig1 created.');
    } else {
      console.log('Default wallet generation config for walletGenConfig1 already exists.');
    }

    // ----- Seed default entry for WalletGenerationConfig (BSC) -----
    let walletGenConfig2 = await WalletGenerationConfig.findOne({ network: 'BSC' });
    if (!walletGenConfig2) {
      walletGenConfig2 = new WalletGenerationConfig({
        count: 5, // Example: generate 5 addresses per run
        derivation_path: "m/44'/60'/0'/0", // Assuming same derivation path; adjust if needed
        enabled: true,
        seedVersion: 'v1',
      });
      await walletGenConfig2.save();
      console.log('Default wallet generation config for walletGenConfig2 created.');
    } else {
      console.log('Default wallet generation config for walletGenConfig2 already exists.');
    }

    // ----- Seed default entry for SchedulerConfig -----
    // For WalletGeneration scheduler
    let schedulerConfig = await SchedulerConfig.findOne({ name: SchedulerTypes.WALLET_GENERATION });
    if (!schedulerConfig) {
      schedulerConfig = new SchedulerConfig({
        name: SchedulerTypes.WALLET_GENERATION,
        cronExpression: '* * * * *', // Every minute for testing
        description: 'Scheduler for generating wallet addresses',
        enabled: false,
      });
      await schedulerConfig.save();
      console.log('Default WalletGeneration scheduler config created.');
    } else {
      console.log('Default WalletGeneration scheduler config already exists.');
    }

    // For TokenDistribution scheduler
    let tokenSchedulerConfig = await SchedulerConfig.findOne({ name: SchedulerTypes.TOKEN_DISTRIBUTION });
    if (!tokenSchedulerConfig) {
      tokenSchedulerConfig = new SchedulerConfig({
        name: SchedulerTypes.TOKEN_DISTRIBUTION,
        cronExpression: '* * * * *', // Daily at 23:55
        description: 'Scheduler for distributing tokens to wallets',
        enabled: false,
      });
      await tokenSchedulerConfig.save();
      console.log('Default TokenDistribution scheduler config created.');
    } else {
      console.log('Default TokenDistribution scheduler config already exists.');
    }

    console.log('Seeding complete.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding default entries:', error);
    process.exit(1);
  }
}

seedDefaultEntries();
