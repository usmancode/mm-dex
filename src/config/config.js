const dotenv = require('dotenv');
const path = require('path');
const Joi = require('joi');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string().valid('production', 'development', 'test').required(),
    PORT: Joi.number().default(3000),
    MONGODB_URL: Joi.string().required().description('Mongo DB url'),
    JWT_SECRET: Joi.string().required().description('JWT secret key'),
    JWT_ACCESS_EXPIRATION_MINUTES: Joi.number().default(30).description('minutes after which access tokens expire'),
    JWT_REFRESH_EXPIRATION_DAYS: Joi.number().default(30).description('days after which refresh tokens expire'),
    JWT_RESET_PASSWORD_EXPIRATION_MINUTES: Joi.number()
      .default(10)
      .description('minutes after which reset password token expires'),
    JWT_VERIFY_EMAIL_EXPIRATION_MINUTES: Joi.number()
      .default(10)
      .description('minutes after which verify email token expires'),
    SMTP_HOST: Joi.string().description('server that will send the emails'),
    SMTP_PORT: Joi.number().description('port to connect to the email server'),
    SMTP_USERNAME: Joi.string().description('username for email server'),
    SMTP_PASSWORD: Joi.string().description('password for email server'),
    EMAIL_FROM: Joi.string().description('the from field in the emails sent by the app'),
    // AWS / KMS configuration
    AWS_REGION: Joi.string().required().description('AWS region'),
    AWS_ACCESS_KEY_ID: Joi.string().required().description('AWS access key'),
    AWS_SECRET_ACCESS_KEY: Joi.string().required().description('AWS secret access key'),
    KMS_KEY_ID: Joi.string().required().description('KMS key id'),
    ENCRYPTED_MASTER_SEED: Joi.string().required().description('Encrypted master seed in base64'),
    MASTER_SEED_VERSION: Joi.string().default('v1').description('Version of the master seed (e.g., v1, v2)'),
    QUICKNODE_RPC: Joi.string().description('QuickNode RPC endpoint'),
    UNISWAP_ROUTER_ADDRESS: Joi.string().required().description('Uniswap Router contract address'),
    QUICKSWAP_ROUTER_ADDRESS: Joi.string().required().description('QuickSwap Router contract address'),
    UNISWAP_WETH: Joi.string().required().description('WETH token address used in Uniswap swaps'),
    QUICKSWAP_WPOL: Joi.string().required().description('WPOL token address used in QuickSwap swaps'),
  })
  .unknown();

const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

if (error) {
  console.error('Config validation error:', error);
  throw new Error(`Config validation error: ${error.message}`);
}

module.exports = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  mongoose: {
    url: envVars.MONGODB_URL + (envVars.NODE_ENV === 'test' ? '-test' : ''),
  },
  apiKey: process.env.API_KEY || 'your-secure-api-key',
  jwt: {
    secret: envVars.JWT_SECRET,
    accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
    refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,
    resetPasswordExpirationMinutes: envVars.JWT_RESET_PASSWORD_EXPIRATION_MINUTES,
    verifyEmailExpirationMinutes: envVars.JWT_VERIFY_EMAIL_EXPIRATION_MINUTES,
  },
  email: {
    smtp: {
      host: envVars.SMTP_HOST,
      port: envVars.SMTP_PORT,
      auth: {
        user: envVars.SMTP_USERNAME,
        pass: envVars.SMTP_PASSWORD,
      },
    },
    from: envVars.EMAIL_FROM,
  },
  aws: {
    region: envVars.AWS_REGION,
    accessKeyId: envVars.AWS_ACCESS_KEY_ID,
    secretAccessKey: envVars.AWS_SECRET_ACCESS_KEY,
    kmsKeyId: envVars.KMS_KEY_ID,
    encryptedMasterSeed: envVars.ENCRYPTED_MASTER_SEED,
    masterSeedVersion: envVars.MASTER_SEED_VERSION,
  },
  rpc: {
    quicknode: envVars.QUICKNODE_RPC,
    uniswap: envVars.QUICKNODE_RPC,
  },
  uniswap: {
    routerAddress: envVars.UNISWAP_ROUTER_ADDRESS,
    routerABI: require('../config/abis/UniswapV4Router.json'),
    WETH: envVars.UNISWAP_WETH,
    factoryAddress: envVars.UNISWAP_FACTORY_ADDRESS,
    factoryABI: require('../config/abis/UniswapFactory.json'),
    poolABI: require('../config/abis/UniswapPool.json'),
    poolAddress: envVars.UNISWAP_POOL_ADDRESS,
    FEE_TIER: 3000, // 0.3% fee tier
    slippageTolerance: 1.5, // 1.5% slippage
    minNativeForGas: 7000000000000n, // Minimum native token balance for gas fees
    chainId: 8453, // Base chain ID for Uniswap
    name: 'uniswap',
  },
  quickswap: {
    routerAddress: envVars.QUICKSWAP_ROUTER_ADDRESS,
    routerABI: require('../config/abis/QuickswapRouter.json'),
    WPOL: envVars.QUICKSWAP_WPOL,
    factoryAddress: envVars.QUICKSWAP_FACTORY_ADDRESS,
    factoryABI: require('../config/abis/QuickswapFactory.json'),
    poolABI: require('../config/abis/quickswapPool.json'),
    poolAddress: envVars.QUICKSWAP_POOL_ADDRESS,
    FEE_TIER: 100, // 0.1% fee tier
    slippageTolerance: 1.5, // 1.5% slippage
    DEADLINE_BUFFER: 300, // 5 minutes
  },
};
