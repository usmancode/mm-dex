const Transaction = require('../models/transaction.model');
const mongoose = require('mongoose');

const getTransactions = async (req, res) => {
  try {
    const filter = {};

    // Filter handling
    if (req.query.id) {
      if (mongoose.Types.ObjectId.isValid(req.query.id)) {
        filter._id = req.query.id;
      } else {
        return res.status(400).json({ error: 'Invalid transaction ID' });
      }
    }
    if (req.query.transactionHash) filter.transactionHash = req.query.transactionHash;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.dex) filter.dex = req.query.dex;
    if (req.query.txnType) filter.txnType = req.query.txnType;

    // Process sorting according to plugin requirements
    let sortBy = '';
    if (req.query.sortBy) {
      const validSortFields = ['createdAt', 'amount', 'updatedAt']; // Add other sortable fields
      const sortingCriteria = req.query.sortBy
        .split(',')
        .filter((criteria) => {
          const [field, order] = criteria.split(':');
          return validSortFields.includes(field) && ['asc', 'desc'].includes(order);
        })
        .join(',');

      sortBy = sortingCriteria;
    }

    // Pagination options
    const options = {
      sortBy: sortBy || 'createdAt:desc', // Default sorting
      limit: parseInt(req.query.limit, 10) || 10,
      page: parseInt(req.query.page, 10) || 1,
    };

    // Execute paginated query
    console.log('Filter:', filter);
    console.log('Options:', options);
    const result = await Transaction.paginate(filter, options);

    // Format Decimal128 values to string
    const formattedResults = result.results.map((transaction) => ({
      ...transaction.toJSON(),
      amount: transaction.amount.toString(),
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    }));

    res.status(200).json({
      results: formattedResults,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      totalResults: result.totalResults,
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getTransactions,
};
