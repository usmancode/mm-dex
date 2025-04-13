// routes/v1/trade.route.js
const express = require('express');
const tradeController = require('../../controllers/trade.controller'); // Adjust the path as needed

const router = express.Router();

// POST /v1/trade
router.post('/', tradeController.initiateTrade);

module.exports = router;
