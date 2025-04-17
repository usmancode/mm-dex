const express = require('express');
const docsRoute = require('./docs.route');
const tradeRoute = require('./trade.route'); // Import your trade route
const distReturnConfigRoute = require('./distReturnConfig.route'); // Import distReturnConfig route
const transactionRoute = require('./transaction.route'); // Add this line
const cryptoTokenRoute = require('./cryptoToken.route'); // Import cryptoToken route
const schedulerConfigRoute = require('./schedulerConfig.route'); // Import SchedulerConfig route
const walletGenerationConfigRoute = require('./walletGenerationConfig.route'); // Import WalletGenerationConfig route
const poolRoute = require('./pool.route'); // Import pool route
const walletRoute = require('./wallet.route');
const config = require('../../config/config');
const { apiKeyAuth } = require('../../middlewares/auth'); // Import apiKeyAuth
const balanceRoute = require('./balance.route'); // Import balance route

const router = express.Router();
const devRoutes = [
  // routes available only in development mode
  {
    path: '/docs',
    route: docsRoute,
  },
];
/* istanbul ignore next */
if (config.env === 'development') {
  devRoutes.forEach((route) => {
    router.use(route.path, route.route);
  });
}
router.use(apiKeyAuth);

const defaultRoutes = [
  {
    path: '/trade',
    route: tradeRoute,
  },
  {
    path: '/dist-return-configs',
    route: distReturnConfigRoute,
  },
  {
    path: '/transactions',
    route: transactionRoute,
  },
  {
    path: '/tokens',
    route: cryptoTokenRoute,
  },
  {
    path: '/scheduler-configs',
    route: schedulerConfigRoute,
  },
  {
    path: '/wallet-generation-configs',
    route: walletGenerationConfigRoute,
  },
  {
    path: '/pools',
    route: poolRoute,
  },
  {
    path: '/balances',
    route: balanceRoute,
  },
  {
    path: '/wallets',
    route: walletRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;
