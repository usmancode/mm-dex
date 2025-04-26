const express = require('express');
const router = express.Router();
const PriceController = require('../../controllers/price.controller');

/**
 * @swagger
 * /price:
 *   get:
 *     summary: Get price information
 *     tags:
 *       - Price
 *     parameters:
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *           enum: [BUY, SELL]
 *       - in: query
 *         name: poolId
 *         schema:
 *           type: string
 *         description: ID of the pool.
 *         example: 680af117c67910592daf7cd4
 *       - in: query
 *         name: amount
 *         schema:
 *           type: number
 *         description: Amount of token to buy/sell.
 *     security:
 *       - apiKey: []
 *     responses:
 *       200:
 *         description: Price data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 price:
 *                   type: number
 *                   example: 123.45
 *       500:
 *         description: Server error
 */

router.get('/', PriceController.getPrice);

module.exports = router;
