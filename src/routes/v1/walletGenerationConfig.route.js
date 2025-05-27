const express = require('express');
const validate = require('../../middlewares/validate');
const walletGenConfigController = require('../../controllers/walletGenerationConfig.controller');
const walletGenConfigValidation = require('../../validations/walletGenerationConfig.validation');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: WalletGenerationConfig
 *   description: Wallet generation configuration management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     WalletGenerationConfig:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "67feca3e26ddec127324994d"
 *         name:
 *           type: string
 *           example: "My Wallet Config"
 *         enabled:
 *           type: boolean
 *           example: true
 *         params:
 *           type: object
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
 * /wallet-generation-configs:
 *   get:
 *     summary: Get a list of wallet generation configs
 *     description: Retrieve all wallet generation configs with optional pagination.
 *     tags: [WalletGenerationConfig]
 *     security:
 *      - apiKey: []
 *     parameters:
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 10
 *         description: Maximum number of configs to return.
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination.
 *     responses:
 *       200:
 *         description: A paginated list of wallet generation configs.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/WalletGenerationConfig'
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
 *   post:
 *     summary: Create a wallet generation config
 *     description: Create a new wallet generation config.
 *     tags: [WalletGenerationConfig]
 *     security:
 *      - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WalletGenerationConfig'
 *     responses:
 *       201:
 *         description: Wallet generation config created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WalletGenerationConfig'
 */

/**
 * @swagger
 * /wallet-generation-configs/{id}:
 *   patch:
 *     summary: Update a wallet generation config
 *     description: Update a specific wallet generation config by ID.
 *     tags: [WalletGenerationConfig]
 *     security:
 *      - apiKey: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The wallet generation config ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WalletGenerationConfig'
 *     responses:
 *       200:
 *         description: Wallet generation config updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WalletGenerationConfig'
 *   delete:
 *     summary: Delete a wallet generation config
 *     description: Delete a specific wallet generation config by ID.
 *     tags: [WalletGenerationConfig]
 *     security:
 *      - apiKey: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The wallet generation config ID.
 *     responses:
 *       204:
 *         description: Wallet generation config deleted successfully.
 */

router
  .route('/')
  .get(walletGenConfigController.listConfigs)
  .post(validate(walletGenConfigValidation.createConfig), walletGenConfigController.createConfig);

router
  .route('/:id')
  .patch(validate(walletGenConfigValidation.updateConfig), walletGenConfigController.updateConfig)
  .delete(walletGenConfigController.deleteConfig);

module.exports = router;
