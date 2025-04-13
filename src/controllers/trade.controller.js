// src/controllers/trade.controller.js
const tradeService = require('../services/trade.service');

exports.initiateTrade = async (req, res, next) => {
  try {
    // Validate required fields: token, amount, and protocol.
    const { tokenIn, tokenOut, amount, protocol } = req.body;
    if (!tokenIn || !tokenOut || !amount || !protocol) {
      return res.status(400).json({ error: 'token, amount, and protocol are required.' });
    }

    // Enqueue the trade job (the job data is passed to the service layer)
    const jobId = await tradeService.enqueueTradeJob({ tokenIn, tokenOut, amount, protocol });
    res.status(202).json({ message: 'Trade request accepted', jobId });
  } catch (error) {
    next(error);
  }
};
