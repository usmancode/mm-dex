const express = require('express');
const schedulerConfigController = require('../../controllers/schedulerConfig.controller');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: SchedulerConfig
 *   description: Scheduler configuration management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     SchedulerConfig:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           enum: [WalletGeneration, TokenDistribution]
 *           example: "WalletGeneration, TokenDistribution"
 *         enabled:
 *           type: boolean
 *           example: true
 *         cronExpression:
 *           type: string
 *           example: "0 0 * * *"
 *         triggerImmediately:
 *           type: boolean
 *           example: false
 *         description:
 *           type: string
 *           example: "Scheduler for my task"
 *
 *
 */

/**
 * @swagger
 * /scheduler-configs:
 *   get:
 *     summary: Get a list of scheduler configs
 *     description: Retrieve all scheduler configs with optional pagination.
 *     tags: [SchedulerConfig]
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
 *         description: A paginated list of scheduler configs.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SchedulerConfig'
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
 *             example:
 *               results:
 *                 - name: "WalletGeneration"
 *                   cronExpression: "* * * * *"
 *                   description: "Scheduler for generating wallet addresses"
 *                   enabled: false
 *                   lastRun: "2025-04-18T01:01:07.737Z"
 *                   lastModified: "2025-04-18T00:53:00.070Z"
 *                   triggerImmediately: false
 *                   version: 1
 *                   id: "67d9fec9162129697215c990"
 *               page: 1
 *               limit: 1
 *               totalPages: 2
 *               totalResults: 2
 *   post:
 *     summary: Create a scheduler config
 *     description: Create a new scheduler config.
 *     tags: [SchedulerConfig]
 *     security:
 *      - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SchedulerConfig'
 *     responses:
 *       201:
 *         description: Scheduler config created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SchedulerConfig'
 */

/**
 * @swagger
 * /scheduler-configs/{schedulerConfigId}:
 *   patch:
 *     summary: Update a scheduler config
 *     description: Update a specific scheduler config by ID.
 *     tags: [SchedulerConfig]
 *     security:
 *      - apiKey: []
 *     parameters:
 *       - in: path
 *         name: schedulerConfigId
 *         required: true
 *         schema:
 *           type: string
 *         description: The scheduler config ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SchedulerConfig'
 *           example:
 *             cronExpression: "* * * * *"
 *             enabled: false
 *             triggerImmediately: false
 *     responses:
 *       200:
 *         description: Scheduler config updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SchedulerConfig'
 */

router.route('/').get(schedulerConfigController.getSchedulerConfigs).post(schedulerConfigController.createSchedulerConfig);

// PATCH: Update a specific SchedulerConfig
router.route('/:schedulerConfigId').patch(schedulerConfigController.updateSchedulerConfig);

module.exports = router;
