// src/controllers/trade.controller.js
const Pool = require('../models/pool.model');
const tradeService = require('../services/trade.service');

exports.initiateTrade = async (req, res, next) => {
  try {
    // Validate required fields: token, amount, and protocol.
    const { action, amount, poolId } = req.body;
    if (!action || !poolId || !amount) {
      return res.status(400).json({ error: 'action, amount, and poolId are required.' });
    }
    const pool = await Pool.findById(poolId);
    if (!pool) {
      return res.status(404).json({ error: 'Pool not found.' });
    }
    if (!pool.active) {
      return res.status(400).json({ error: 'Pool is not active.' });
    }
    // Enqueue the trade job (the job data is passed to the service layer)
    const jobId = await tradeService.enqueueTradeJob({ action, amount, poolId });
    res.status(202).json({ message: 'Trade request accepted', jobId });
  } catch (error) {
    next(error);
  }
};
