const express = require('express');
const tradeController = require('../../controllers/trade.controller'); // Adjust the path as needed

const router = express.Router();

router.post('/', tradeController.initiateTrade);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: Trades
 *   description: Token trading operations
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     TradeResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "Trade request accepted"
 *         jobId:
 *           type: string
 *           example: "1185"
 *
 *   responses:
 *     InvalidInput:
 *       description: Invalid input parameters
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 *           example:
 *             code: 400
 *             message: "Invalid token pair"
 */

/**
 * @swagger
 * /trade:
 *   post:
 *     summary: Initiate a token trade
 *     description: Execute a token swap using specified protocol
 *     tags: [Trades]
 *     security:
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tokenIn
 *               - tokenOut
 *               - amount
 *               - protocol
 *             properties:
 *               tokenIn:
 *                 type: string
 *                 example: "67d9fec8162129697215c981"
 *               tokenOut:
 *                 type: string
 *                 example: "67d9fec8162129697215c97e"
 *               amount:
 *                 type: string
 *                 example: "1000"
 *               protocol:
 *                 type: string
 *                 enum: [uniswap, sushiswap, pancakeswap, quickswap]
 *                 example: "uniswap"
 *     responses:
 *       "202":
 *         description: Trade request accepted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TradeResponse'
 *       "400":
 *         $ref: '#/components/responses/InvalidInput'
 *       "401":
 *         description: Invalid API Key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               code: 401
 *               message: Invalid API Key
 */
