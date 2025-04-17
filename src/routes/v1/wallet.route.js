const express = require('express');
const { listWallets } = require('../../controllers/wallet.controller');

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
 *         - createdAt
 *         - updatedAt
 *
 * /wallets:
 *   get:
 *     summary: List wallet documents
 *     description: Returns a paginated list of wallets. Supports filtering by type.
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
 */

router.get('/', listWallets);

module.exports = router;
