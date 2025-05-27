const express = require('express');
const validate = require('../../middlewares/validate');
const distReturnConfigValidation = require('../../validations/distReturnConfig.validation');
const distReturnConfigController = require('../../controllers/distReturnConfig.controller');

const router = express.Router();

router
  .route('/')
  .post(validate(distReturnConfigValidation.createDistReturnConfig), distReturnConfigController.createDistReturnConfig)
  .get(validate(distReturnConfigValidation.getDistReturnConfigs), distReturnConfigController.getDistReturnConfigs);

router
  .route('/:id')
  .get(validate(distReturnConfigValidation.getDistReturnConfig), distReturnConfigController.getDistReturnConfig)
  .patch(validate(distReturnConfigValidation.updateDistReturnConfig), distReturnConfigController.updateDistReturnConfig)
  .delete(validate(distReturnConfigValidation.deleteDistReturnConfig), distReturnConfigController.deleteDistReturnConfig);

module.exports = router;

/**
 * @swagger
 * tags:
 *   name: DistReturnConfigs
 *   description: Distribution Return Configuration management
 */

/**
 * @swagger
 * /dist-return-configs:
 *   post:
 *     summary: Create a distribution return configuration
 *     description: Only admins can create configurations.
 *     tags: [DistReturnConfigs]
 *     security:
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - network
 *               - chainId
 *               - activePoolSize
 *               - nativeDistributionAmount
 *               - tokenDistributionAmount
 *               - minNativeDistributionAmount
 *               - maxNativeDistributionAmount
 *               - minTokenDistributionAmount
 *               - maxTokenDistributionAmount
 *               - maxNativeLeftOver
 *               - maxTokenLeftOver
 *               - returnEnabled
 *               - pool
 *               - masterWallet
 *               - returnAfter
 *               - expireAt
 *               - token0
 *             properties:
 *               network:
 *                 type: string
 *                 description: Name of the network (e.g., ETHEREUM, BSC)
 *               chainId:
 *                 type: string
 *                 description: Blockchain chain ID
 *               activePoolSize:
 *                 type: number
 *                 description: Number of wallets in the active pool for distribution
 *               nativeDistributionAmount:
 *                 type: number
 *                 description: Total native funds (e.g., ETH) allocated for distribution
 *               tokenDistributionAmount:
 *                 type: number
 *                 description: Total token funds allocated for distribution
 *               minNativeDistributionAmount:
 *                 type: number
 *                 description: Minimum native amount to transfer per wallet
 *               maxNativeDistributionAmount:
 *                 type: number
 *                 description: Maximum native amount to transfer per wallet
 *               minTokenDistributionAmount:
 *                 type: number
 *                 description: Minimum token amount to transfer per wallet
 *               maxTokenDistributionAmount:
 *                 type: number
 *                 description: Maximum token amount to transfer per wallet
 *               maxNativeLeftOver:
 *                 type: number
 *                 description: How much native leftover is allowed in the wallet after distribution/return
 *               maxTokenLeftOver:
 *                 type: number
 *                 description: How much token leftover is allowed in the wallet after distribution/return
 *               returnEnabled:
 *                 type: boolean
 *                 description: Whether returning of funds is currently enabled
 *               pool:
 *                 type: string
 *                 description: Reference to the pool doc to use for distribution/returns
 *               enabled:
 *                 type: boolean
 *                 description: Whether distribution is currently enabled
 *               masterWallet:
 *                 type: string
 *                 description: Reference to the wallet doc to use as the master wallet for distribution/returns
 *               returnAfter:
 *                 type: string
 *                 format: date-time
 *                 description: Date/time after which funds can be returned to master wallet
 *               expireAt:
 *                 type: string
 *                 format: date-time
 *                 description: Distribution configuration expiration date and time
 *               token0:
 *                 type: string
 *                 description: Reference to the Token A configuration
 *               token1:
 *                 type: string
 *                 description: Reference to the Token B configuration (optional)
 *             example:
 *               network: "ETHEREUM"
 *               chainId: "1"
 *               activePoolSize: 100
 *               nativeDistributionAmount: 0.01
 *               tokenDistributionAmount: 0.001
 *               minNativeDistributionAmount: 0.001
 *               maxNativeDistributionAmount: 0.1
 *               minTokenDistributionAmount: 0.001
 *               maxTokenDistributionAmount: 0.1
 *               maxNativeLeftOver: 0.001
 *               maxTokenLeftOver: 0.001
 *               returnEnabled: true
 *               pool: "60d21b4667d0d8992e610c85"
 *               masterWallet: "60d21b4667d0d8992e610c86"
 *               returnAfter: "2024-12-31T23:59:59Z"
 *               expireAt: "2024-12-31T23:59:59Z"
 *               token0: "60d21b4667d0d8992e610c87"
 *               token1: "60d21b4667d0d8992e610c88"
 *     responses:
 *       "201":
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/DistReturnConfig'
 *       "400":
 *         $ref: '#/components/responses/DuplicateKey'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *
 *   get:
 *     summary: Get all configurations
 *     description: Only admins can retrieve all configurations.
 *     tags: [DistReturnConfigs]
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: sort by query in the form of field:desc/asc (ex. configName:asc)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 10
 *         description: Maximum number of configs
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: enabled
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: configName
 *         schema:
 *           type: string
 *         description: Configuration name filter
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
 *                     $ref: '#/components/schemas/DistReturnConfig'
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
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /dist-return-configs/{id}:
 *   get:
 *     summary: Get a configuration
 *     description: Only admins can fetch configuration details.
 *     tags: [DistReturnConfigs]
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Configuration ID
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/DistReturnConfig'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   patch:
 *     summary: Update a configuration
 *     description: Only admins can update configurations.
 *     tags: [DistReturnConfigs]
 *     security:
 *      - apiKey: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Configuration ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             example:
 *               nativeDistributionAmount: 0.01
 *               tokenDistributionAmount: 0.001
 *               minNativeDistributionAmount: 0.001
 *               maxNativeDistributionAmount: 0.1
 *               minTokenDistributionAmount: 0.001
 *               maxTokenDistributionAmount: 0.1
 *               activePoolSize: 100
 *     responses:
 *       "200":
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *                $ref: '#/components/schemas/DistReturnConfig'
 *       "400":
 *         $ref: '#/components/responses/DuplicateKey'
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 *
 *   delete:
 *     summary: Delete a configuration
 *     description: Only admins can delete configurations.
 *     tags: [DistReturnConfigs]
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Configuration ID
 *     responses:
 *       "200":
 *         description: No content
 *       "401":
 *         $ref: '#/components/responses/Unauthorized'
 *       "403":
 *         $ref: '#/components/responses/Forbidden'
 *       "404":
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     DistReturnConfig:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique identifier
 *         network:
 *           type: string
 *           description: Name of the network (e.g., ETHEREUM, BSC)
 *         chainId:
 *           type: string
 *           description: Blockchain chain ID
 *         activePoolSize:
 *           type: number
 *           description: Number of wallets in the active pool for distribution
 *         nativeDistributionAmount:
 *           type: number
 *           description: Total native funds (e.g., ETH) allocated for distribution
 *         tokenDistributionAmount:
 *           type: number
 *           description: Total token funds allocated for distribution
 *         minNativeDistributionAmount:
 *           type: number
 *           description: Minimum native amount to transfer per wallet
 *         maxNativeDistributionAmount:
 *           type: number
 *           description: Maximum native amount to transfer per wallet
 *         minTokenDistributionAmount:
 *           type: number
 *           description: Minimum token amount to transfer per wallet
 *         maxTokenDistributionAmount:
 *           type: number
 *           description: Maximum token amount to transfer per wallet
 *         maxNativeLeftOver:
 *           type: number
 *           description: How much native leftover is allowed in the wallet after distribution/return
 *         maxTokenLeftOver:
 *           type: number
 *           description: How much token leftover is allowed in the wallet after distribution/return
 *         returnEnabled:
 *           type: boolean
 *           description: Whether returning of funds is currently enabled
 *         pool:
 *           type: string
 *           description: Reference to the pool doc to use for distribution/returns
 *         enabled:
 *           type: boolean
 *           description: Whether distribution is currently enabled
 *         masterWallet:
 *           type: string
 *           description: Reference to the wallet doc to use as the master wallet for distribution/returns
 *         returnAfter:
 *           type: string
 *           format: date-time
 *           description: Date/time after which funds can be returned to master wallet
 *         expireAt:
 *           type: string
 *           format: date-time
 *           description: Distribution configuration expiration date and time
 *         token0:
 *           type: string
 *           description: Reference to the Token A configuration
 *         token1:
 *           type: string
 *           description: Reference to the Token B configuration (optional)
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       example:
 *         _id: "60d21b4667d0d8992e610c85"
 *         network: "ETHEREUM"
 *         chainId: "1"
 *         activePoolSize: 100
 *         nativeDistributionAmount: 0.01
 *         tokenDistributionAmount: 0.001
 *         minNativeDistributionAmount: 0.001
 *         maxNativeDistributionAmount: 0.1
 *         minTokenDistributionAmount: 0.001
 *         maxTokenDistributionAmount: 0.1
 *         maxNativeLeftOver: 0.001
 *         maxTokenLeftOver: 0.001
 *         returnEnabled: true
 *         pool: "60d21b4667d0d8992e610c85"
 *         enabled: true
 *         masterWallet: "60d21b4667d0d8992e610c86"
 *         returnAfter: "2024-12-31T23:59:59Z"
 *         expireAt: "2024-12-31T23:59:59Z"
 *         token0: "60d21b4667d0d8992e610c87"
 *         token1: "60d21b4667d0d8992e610c88"
 *         createdAt: "2024-01-01T00:00:00.000Z"
 *         updatedAt: "2024-01-01T00:00:00.000Z"
 */

/**
 * @swagger
 * components:
 *   responses:
 *     DuplicateKey:
 *       description: Duplicate key error
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *             example:
 *               message: "Duplicate key error"
 *     Unauthorized:
 *       description: Unauthorized
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *             example:
 *               message: "Unauthorized"
 *     Forbidden:
 *       description: Forbidden
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *             example:
 *               message: "Forbidden"
 *     NotFound:
 *       description: Not Found
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *             example:
 *               message: "Not Found"
 */
