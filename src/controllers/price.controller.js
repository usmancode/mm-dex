const PriceService = require('../services/price.service');

async function getPrice(req, res) {
  try {
    const { action, poolId, amount } = req.query;
    if (!action || !poolId || !amount) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    const data = await PriceService.getPriceData(action, poolId, amount);
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getPrice,
};
