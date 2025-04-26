const express = require('express');
const docsRoute = require('./docs.route');
const tradeRoute = require('./trade.route');
const distReturnConfigRoute = require('./distReturnConfig.route');
const transactionRoute = require('./transaction.route');
const cryptoTokenRoute = require('./cryptoToken.route');
const schedulerConfigRoute = require('./schedulerConfig.route');
const walletGenerationConfigRoute = require('./walletGenerationConfig.route');
const poolRoute = require('./pool.route');
const walletRoute = require('./wallet.route');
const config = require('../../config/config');
const { apiKeyAuth } = require('../../middlewares/auth');
const balanceRoute = require('./balance.route');
const priceRoute = require('./price.route');

const router = express.Router();
const devRoutes = [
  // routes available only in development mode
  {
    path: '/docs',
    route: docsRoute,
  },
];
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
  {
    path: '/price',
    route: priceRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;
