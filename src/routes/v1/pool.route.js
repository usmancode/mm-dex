const express = require('express');
const validate = require('../../middlewares/validate'); // Validation middleware
const poolValidation = require('../../validations/pool.validation');
const poolController = require('../../controllers/pool.controller');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Pool:
 *       type: object
 *       properties:
 *         token0:
 *           type: string
 *           description: tokenId of Token A
 *         token1:
 *           type: string
 *           description: tokenId of Token B
 *         poolAddress:
 *           type: string
 *           description: Address of the pool contract
 *         protocol:
 *           type: Enum
 *           enum: [uniswap, quickswap]
 *           description: Protocol used for the pool (e.g., Uniswap, Sushiswap)
 *         chainId:
 *           type: number
 *           description: Chain ID where the pool is deployed
 *         feeTier:
 *           type: number
 *           description: Fee tier for the pool (e.g., 0.3%, 1%)
 *         slippageTolerance:
 *           type: number
 *           description: Slippage tolerance percentage
 *         minNativeForGas:
 *           type: number
 *           description: Minimum native currency required for gas fees
 *       required:
 *         - token0
 *         - token1
 *         - poolAddress
 *         - protocol
 *         - chainId
 *         - feeTier
 *         - slippageTolerance
 *         - minNativeForGas
 */

/**
 * @swagger
 * tags:
 *   name: Pools
 *   description: Pool management
 */

/**
 * @swagger
 * /pools:
 *   post:
 *     summary: Create a new pool
 *     tags: [Pools]
 *     security:
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Pool'
 *     responses:
 *       201:
 *         description: Pool created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Pool'
 *   get:
 *     summary: Get all pools
 *     tags: [Pools]
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Maximum number of pools to return
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number for pagination
 *     responses:
 *       200:
 *         description: A list of pools
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Pool'
 */

/**
 * @swagger
 * /pools/{poolId}:
 *   get:
 *     summary: Get a pool by ID
 *     tags: [Pools]
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: path
 *         name: poolId
 *         required: true
 *         schema:
 *           type: string
 *         description: Pool ID
 *     responses:
 *       200:
 *         description: Pool data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Pool'
 *   patch:
 *     summary: Update a pool
 *     tags: [Pools]
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: path
 *         name: poolId
 *         required: true
 *         schema:
 *           type: string
 *         description: Pool ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Pool'
 *     responses:
 *       200:
 *         description: Pool updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Pool'
 *   delete:
 *     summary: Delete a pool
 *     tags: [Pools]
 *     security:
 *       - apiKey: []
 *     parameters:
 *       - in: path
 *         name: poolId
 *         required: true
 *         schema:
 *           type: string
 *         description: Pool ID
 *     responses:
 *       200:
 *         description: Pool deleted successfully
 */

router.route('/').post(validate(poolValidation.createPool), poolController.createPool).get(poolController.getPools);

router
  .route('/:poolId')
  .get(validate(poolValidation.getPool), poolController.getPool)
  .patch(validate(poolValidation.updatePool), poolController.updatePool)
  .delete(validate(poolValidation.deletePool), poolController.deletePool);

module.exports = router;
