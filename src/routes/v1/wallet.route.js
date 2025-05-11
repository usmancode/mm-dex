const express = require('express');
const {
  listWallets,
  getWalletStats,
  getWalletUsageByPool,
  searchWalletByAddress,
} = require('../../controllers/wallet.controller');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Wallet:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         address:
 *           type: string
 *         type:
 *           type: string
 *         status:
 *           type: string
 *           enum: [active, inactive]
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       required:
 *         - _id
 *         - address
 *         - type
 *         - status
 *         - createdAt
 *         - updatedAt
 *
 *     WalletStats:
 *       type: object
 *       properties:
 *         totalWallets:
 *           type: integer
 *           description: Total number of wallets in the system
 *         availableWallets:
 *           type: integer
 *           description: Number of wallets available for trading (type=NORMAL)
 *         activeWallets:
 *           type: integer
 *           description: Number of active wallets (status=active)
 *
 * /wallets:
 *   get:
 *     summary: List wallet documents
 *     description: Returns a paginated list of wallets. Supports filtering by type, address, and status.
 *     tags:
 *       - Wallets
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page.
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [NORMAL, MASTER, FUNDING, GAS_STATION]
 *         description: Filter wallets by type.
 *       - in: query
 *         name: address
 *         schema:
 *           type: string
 *         description: Filter wallets by address (supports partial matches, case-insensitive).
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *         description: Filter wallets by status.
 *     responses:
 *       200:
 *         description: A paginated list of wallets
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Wallet'
 *                 totalResults:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *       500:
 *         description: Internal server error
 *
 * /wallets/stats:
 *   get:
 *     summary: Get wallet statistics
 *     description: Returns statistics about wallets including total count, available wallets for trading, and active wallets.
 *     tags:
 *       - Wallets
 *     security:
 *       - apiKey: []
 *     responses:
 *       200:
 *         description: Wallet statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WalletStats'
 *       500:
 *         description: Internal server error
 *
 * /wallets/usage/pool/{poolId}:
 *   get:
 *     summary: Get wallet usage by pool
 *     description: Returns paginated wallet usage data for a specific pool. Supports filtering by wallet address.
 *     tags:
 *       - Wallets
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: path
 *         name: poolId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the pool
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: address
 *         schema:
 *           type: string
 *         description: Filter results by wallet address (supports partial matches, case-insensitive)
 *     responses:
 *       200:
 *         description: Paginated wallet usage data for the pool
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       address:
 *                         type: string
 *                       chainId:
 *                         type: string
 *                       buyWeight:
 *                         type: number
 *                       sellWeight:
 *                         type: number
 *                       lastTradeTime:
 *                         type: string
 *                         format: date-time
 *                       status:
 *                         type: string
 *                 page:
 *                   type: integer
 *                   description: Current page number
 *                 limit:
 *                   type: integer
 *                   description: Number of items per page
 *                 totalPages:
 *                   type: integer
 *                   description: Total number of pages
 *                 totalResults:
 *                   type: integer
 *                   description: Total number of results
 *       500:
 *         description: Internal server error
 *
 * /wallets/{address}:
 *   get:
 *     summary: Get wallet by address
 *     description: Returns detailed information about a specific wallet by its address
 *     tags:
 *       - Wallets
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: path
 *         name: address
 *         required: true
 *         schema:
 *           type: string
 *         description: The wallet address to search for
 *     responses:
 *       200:
 *         description: Wallet details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 address:
 *                   type: string
 *                 aggregateBuyWeight:
 *                   type: number
 *                 aggregateSellWeight:
 *                   type: number
 *                 aggregateVolume:
 *                   type: number
 *                 type:
 *                   type: string
 *                 walletGenerationConfig:
 *                   type: string
 *                 status:
 *                   type: string
 *                 id:
 *                   type: string
 *       404:
 *         description: Wallet not found
 *       500:
 *         description: Internal server error
 */

router.get('/', listWallets);
router.get('/stats', getWalletStats);
router.get('/usage/pool/:poolId', getWalletUsageByPool);

module.exports = router;
