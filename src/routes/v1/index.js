const express = require('express');
const docsRoute = require('./docs.route');
const tradeRoute = require('./trade.route'); // Import your trade route
const distReturnConfigRoute = require('./distReturnConfig.route'); // Import distReturnConfig route
const config = require('../../config/config');
const { apiKeyAuth } = require('../../middlewares/auth'); // Import apiKeyAuth

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
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;
