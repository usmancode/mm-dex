const express = require('express');
const balanceController = require('../../controllers/balance.controller');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Balances
 *   description: Balance management
 */

/**
 * @swagger
 * /balances:
 *   get:
 *     summary: Get all balances
 *     description: Retrieve balances filtered by tokenAddress and walletAddress.
 *     tags: [Balances]
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: query
 *         name: tokenAddress
 *         schema:
 *           type: string
 *         description: Filter by token contract address
 *       - in: query
 *         name: walletAddress
 *         schema:
 *           type: string
 *         description: Filter by wallet address
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 10
 *         description: Maximum number of balances per page
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 docs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Balance'
 *                 totalDocs:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 pagingCounter:
 *                   type: integer
 *                 hasPrevPage:
 *                   type: boolean
 *                 hasNextPage:
 *                   type: boolean
 *                 prevPage:
 *                   type: integer
 *                   nullable: true
 *                 nextPage:
 *                   type: integer
 *                   nullable: true
 *       "404":
 *         description: Token or wallet not found
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Balance:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         wallet:
 *           type: string
 *         token:
 *           type: string
 *         amount:
 *           type: number
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       example:
 *         _id: "60d21b4667d0d8992e610c85"
 *         wallet: "60d21b4667d0d8992e610c99"
 *         token: "60d21b4667d0d8992e610c77"
 *         amount: 1000.50
 *         createdAt: "2023-01-01T00:00:00.000Z"
 *         updatedAt: "2023-01-01T00:00:00.000Z"
 */

router.get('/', balanceController.listBalances);

module.exports = router;
