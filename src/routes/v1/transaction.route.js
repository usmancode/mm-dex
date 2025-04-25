const express = require('express');
const transactionController = require('../../controllers/transaction.controller');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Transactions
 *   description: Blockchain transaction management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Transaction:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "65f7eb5c86a94534d8b456a3"
 *         wallet:
 *           $ref: '#/components/schemas/Wallet'
 *         amount:
 *           type: number
 *           example: 0.0019
 *         transactionHash:
 *           type: string
 *           example: "0x04be36c060f316695c39cebca89f9c2faec4ea80812a9fd66e1cabad71e9a0fb"
 *         status:
 *           type: string
 *           enum: [PENDING, INPROCESS, SUCCESS, FAILED]
 *           example: "SUCCESS"
 *         params:
 *           type: object
 *           additionalProperties: true
 *         message:
 *           type: string
 *           example: "Transaction confirmed"
 *         chainId:
 *           type: string
 *           example: "8453"
 *         txnType:
 *           type: string
 *           enum: [SWAP, REBALANCING, GAS_TRANSFER, TOKEN_TRANSFER, GAS_REFILL, APPROVE]
 *           example: "SWAP"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2024-03-19T10:00:00.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2024-03-19T10:05:00.000Z"
 *     Wallet:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "65f7eb5c86a94534d8b456a3"
 *         address:
 *           type: string
 *           example: "0xCEc5933d94618B64413a8161cd6B8b68b2F439B9"
 *         type:
 *           type: string
 *           example: "NORMAL"
 *         status:
 *           type: string
 *           example: "active"
 *     PaginatedTransactions:
 *       type: object
 *       properties:
 *         results:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Transaction'
 *         page:
 *           type: integer
 *           example: 1
 *         limit:
 *           type: integer
 *           example: 10
 *         totalPages:
 *           type: integer
 *           example: 5
 *         totalResults:
 *           type: integer
 *           example: 50
 */

/**
 * @swagger
 * /transactions:
 *   get:
 *     summary: Get paginated transactions
 *     description: Retrieve transactions with advanced filtering, sorting, and pagination
 *     tags: [Transactions]
 *     security:
 *      - apiKey: []
 *     parameters:
 *       - in: query
 *         name: walletAddress
 *         schema:
 *           type: string
 *         description: Filter by associated wallet address
 *       - in: query
 *         name: transactionHash
 *         schema:
 *           type: string
 *         description: Filter by transaction hash
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, INPROCESS, SUCCESS, FAILED]
 *         description: Filter by transaction status
 *       - in: query
 *         name: txnType
 *         schema:
 *           type: string
 *           enum: [SWAP, REBALANCING, GAS_TRANSFER, TOKEN_TRANSFER, GAS_REFILL, APPROVE]
 *         description: Filter transactions by transaction type (e.g., "SWAP").
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Sort transactions by a specific field (e.g., "createdAt:asc,desc"."amount:asc,desc").
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Maximum number of results per page
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *     responses:
 *       200:
 *         description: Paginated list of transactions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedTransactions'
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

router.route('/').get(transactionController.getTransactions);

module.exports = router;
