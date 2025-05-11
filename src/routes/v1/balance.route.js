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
 *               $ref: '#/components/schemas/BalanceResponse'
 *             example:
 *               results:
 *                 - isNative: false
 *                   token:
 *                     tokenSymbol: "WETH"
 *                     chainId: "8453"
 *                     network: "Base"
 *                     isNative: true
 *                     decimals: 18
 *                     pairAddress: null
 *                     tokenAddress: "0x4200000000000000000000000000000000000006"
 *                     id: "67d9fec8162129697215c97e"
 *                   wallet:
 *                     address: "0x0c76d83f945c56492F2aC163C604BeD94e73273c"
 *                     aggregateBuyWeight: 0
 *                     aggregateSellWeight: 0
 *                     aggregateVolume: 0
 *                     walletGenerationConfig: "67d9fec9162129697215c98a"
 *                     status: "active"
 *                     type: "NORMAL"
 *                     id: "67d9ff648ebb0ffd9012b17a"
 *                   balance: "101748083661717.99999999999999"
 *                   id: "67f9d306379f195c670974b6"
 *               page: 1
 *               limit: 1
 *               totalPages: 2239
 *               totalResults: 2239
 *       "404":
 *         description: Token or wallet not found
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     BalanceResponse:
 *       type: object
 *       properties:
 *         results:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Balance'
 *         page:
 *           type: integer
 *         limit:
 *           type: integer
 *         totalPages:
 *           type: integer
 *         totalResults:
 *           type: integer
 *
 *     Balance:
 *       type: object
 *       properties:
 *         isNative:
 *           type: boolean
 *         token:
 *           $ref: '#/components/schemas/Token'
 *         wallet:
 *           $ref: '#/components/schemas/Wallet'
 *         balance:
 *           type: string
 *         id:
 *           type: string
 *
 *     Token:
 *       type: object
 *       properties:
 *         tokenSymbol:
 *           type: string
 *         chainId:
 *           type: string
 *         network:
 *           type: string
 *         isNative:
 *           type: boolean
 *         decimals:
 *           type: integer
 *         pairAddress:
 *           type: string
 *           nullable: true
 *         tokenAddress:
 *           type: string
 *         id:
 *           type: string
 *
 *     Wallet:
 *       type: object
 *       properties:
 *         address:
 *           type: string
 *         aggregateBuyWeight:
 *           type: number
 *         aggregateSellWeight:
 *           type: number
 *         aggregateVolume:
 *           type: number
 *         walletGenerationConfig:
 *           type: string
 *         status:
 *           type: string
 *         type:
 *           type: string
 *         id:
 *           type: string
 */

/**
 * @swagger
 * /balances/wallet-token-balances:
 *   get:
 *     summary: Get wallet balances for two tokens by chainId
 *     description: Retrieve list of wallets with their balances for tokenA and tokenB by chainId
 *     tags: [Balances]
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: query
 *         name: tokenA
 *         schema:
 *           type: string
 *         required: true
 *         description: Contract address of first token
 *       - in: query
 *         name: tokenB
 *         schema:
 *           type: string
 *         required: true
 *         description: Contract address of second token
 *       - in: query
 *         name: chainId
 *         schema:
 *           type: string
 *         required: true
 *         description: Chain ID
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
 *         description: Maximum number of results per page
 *     responses:
 *       "200":
 *         description: OK
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
 *                         description: Wallet address
 *                         example: "0x0c76d83f945c56492F2aC163C604BeD94e73273c"
 *                       tokenABalance:
 *                         type: string
 *                         description: Balance of tokenA
 *                         example: "1000000000000000000"
 *                       tokenBBalance:
 *                         type: string
 *                         description: Balance of tokenB
 *                         example: "2000000000000000000"
 *                       status:
 *                         type: string
 *                         description: Wallet status
 *                         example: "active"
 *                 page:
 *                   type: integer
 *                   description: Current page number
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   description: Number of items per page
 *                   example: 10
 *                 totalPages:
 *                   type: integer
 *                   description: Total number of pages
 *                   example: 5
 *                 totalResults:
 *                   type: integer
 *                   description: Total number of results
 *                   example: 50
 *       "400":
 *         description: Bad Request - Missing required parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Both tokenA and tokenB are required"
 *       "404":
 *         description: Not Found - One or both tokens not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "One or both tokens not found"
 */

router.get('/', balanceController.listBalances);
router.get('/wallet-token-balances', balanceController.getWalletTokenBalances);

module.exports = router;
