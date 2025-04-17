// routes/transactions.js

const express = require('express');
// Uncomment and adjust the following lines if you use validation middleware
// const validate = require('../../middlewares/validate');
// const transactionValidation = require('../../validations/transaction.validation');
const transactionController = require('../../controllers/transaction.controller');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Transactions
 *   description: Transaction management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Transaction:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "67feca3e26ddec127324994d"
 *         wallet:
 *           type: string
 *           example: "67fa5cbc0fa0f3e8571d6ce3"
 *         amount:
 *           type: string
 *           example: "100000000000000000000"
 *         transactionHash:
 *           type: string
 *           example: "0x04be36c060f316695c39cebca89f9c2faec4ea80812a9fd66e1cabad71e9a0fb"
 *         status:
 *           type: string
 *           example: "SUCCESS"
 *         params:
 *           type: object
 *         message:
 *           type: string
 *           example: "Transaction confirmed"
 *         chainId:
 *           type: string
 *           example: "8453"
 *         dex:
 *           type: string
 *           example: "uniswap"
 *         txnType:
 *           type: string
 *           example: "SWAP"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2025-04-15T21:06:06.520Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           example: "2025-04-15T21:06:14.946Z"
 */

/**
 * @swagger
 * /transactions:
 *   get:
 *     summary: Get a list of transactions
 *     description: Retrieve all transactions with optional filtering by id, transactionHash, status, dex, txnType, sorting, and pagination.
 *     tags: [Transactions]
 *     security:
 *      - apiKey: []
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: string
 *         description: Filter transactions by the transaction's MongoDB ObjectId.
 *       - in: query
 *         name: transactionHash
 *         schema:
 *           type: string
 *         description: Filter transactions by transaction hash.
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, INPROCESS, SUCCESS, FAILED]
 *         description: Filter transactions by status.
 *       - in: query
 *         name: dex
 *         schema:
 *           type: string
 *           enum: [uniswap,quickswap]
 *         description: Filter transactions by dex (e.g., "uniswap").
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
 *           default: 10
 *         description: Maximum number of transactions to return.
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination.
 *     responses:
 *       200:
 *         description: A paginated list of transactions.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Transaction'
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 10
 *                 totalPages:
 *                   type: integer
 *                   example: 1
 *                 totalResults:
 *                   type: integer
 *                   example: 1
 */

router
  .route('/')

  .get(transactionController.getTransactions);

module.exports = router;
