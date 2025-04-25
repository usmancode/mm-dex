const { version } = require('../../package.json');
const config = require('../config/config');

const swaggerDef = {
  openapi: '3.0.0',
  info: {
    title: 'D24 Wallet Management And Trade  API',
    version,
  },
  servers: [
    {
      url: `${config.SWAGGER_URL}`,
    },
  ],
};
module.exports = swaggerDef;
