const express = require('express');
const {
  createCryptoToken,
  getCryptoTokens,
  updateCryptoToken,
  deleteCryptoToken,
} = require('../../controllers/cryptoToken.controller');

const router = express.Router();

/**
 * @openapi
 * /tokens:
 *   get:
 *     tags:
 *       - Tokens
 *     security:
 *       - apiKey: []
 *     summary: Retrieve a list of crypto tokens
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Page size
 *     responses:
 *       200:
 *         description: A paginated list of crypto tokens
 *   post:
 *     tags:
 *       - Tokens
 *     security:
 *       - apiKey: []
 *     summary: Create a new crypto token
 *     requestBody:
 *       description: CryptoToken object to add
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tokenSymbol:
 *                 type: string
 *               network:
 *                 type: string
 *               chainId:
 *                 type: string
 *               isNative:
 *                 type: boolean
 *               decimals:
 *                 type: number
 *     responses:
 *       201:
 *         description: Crypto token created successfully
 */
router.route('/').get(getCryptoTokens).post(createCryptoToken);

/**
 * @openapi
 * /tokens/{id}:
 *   patch:
 *     tags:
 *       - Tokens
 *     security:
 *       - apiKey: []
 *     summary: Update an existing crypto token
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: CryptoToken ID to update
 *         schema:
 *           type: string
 *     requestBody:
 *       description: Fields to update in the CryptoToken
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tokenSymbol:
 *                 type: string
 *               network:
 *                 type: string
 *               chainId:
 *                 type: string
 *               isNative:
 *                 type: boolean
 *               decimals:
 *                 type: number
 *     responses:
 *       200:
 *         description: Crypto token updated successfully
 *   delete:
 *     tags:
 *       - Tokens
 *     security:
 *       - apiKey: []
 *     summary: Delete a crypto token
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: CryptoToken ID to delete
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Crypto token deleted successfully
 *       404:
 *         description: Crypto token not found
 */
router.route('/:id').patch(updateCryptoToken).delete(deleteCryptoToken);

module.exports = router;
