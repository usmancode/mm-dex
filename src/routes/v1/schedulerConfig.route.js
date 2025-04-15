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
 *         _id:
 *           type: string
 *           example: "67feca3e26ddec127324994d"
 *         name:
 *           type: string
 *           example: "My Scheduler"
 *         enabled:
 *           type: boolean
 *           example: true
 *         cron:
 *           type: string
 *           example: "0 0 * * *"
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
