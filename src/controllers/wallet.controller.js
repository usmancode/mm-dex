const Wallet = require('../models/wallet.model');
const WalletTypes = require('../enums/walletTypes'); // Make sure this path matches your project structure
const WalletUsage = require('../models/walletUsage.model');

const listWallets = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const filter = {};

    // Filter by type
    if (req.query.type && Object.values(WalletTypes).includes(req.query.type)) {
      filter.type = req.query.type;
    }

    // Filter by address (case-insensitive partial match)
    if (req.query.address) {
      filter.address = { $regex: req.query.address, $options: 'i' };
    }

    // Filter by status
    if (req.query.status && ['active', 'inactive'].includes(req.query.status)) {
      filter.status = req.query.status;
    }

    const options = {
      page,
      limit,
      sort: { createdAt: -1 },
      lean: true, // Use lean for better performance
    };

    const paginatedWallets = await Wallet.paginate(filter, options);

    // Transform the results to match the desired format
    const sanitizedResults = paginatedWallets.results.map((wallet) => ({
      address: wallet.address,
      aggregateBuyWeight: wallet.aggregateBuyWeight,
      aggregateSellWeight: wallet.aggregateSellWeight,
      aggregateVolume: wallet.aggregateVolume,
      type: wallet.type,
      walletGenerationConfig: wallet.walletGenerationConfig,
      status: wallet.status,
      id: wallet._id,
    }));

    res.status(200).json({
      results: sanitizedResults,
      page: paginatedWallets.page,
      limit: paginatedWallets.limit,
      totalPages: paginatedWallets.totalPages,
      totalResults: paginatedWallets.totalResults,
    });
  } catch (error) {
    console.error('Error in listWallets:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getWalletStats = async (req, res) => {
  try {
    const [totalWallets, availableWallets, activeWallets] = await Promise.all([
      Wallet.countDocuments(),
      Wallet.countDocuments({ type: WalletTypes.NORMAL }),
      Wallet.countDocuments({ status: 'active' }),
    ]);

    res.status(200).json({
      totalWallets,
      availableWallets,
      activeWallets,
    });
  } catch (error) {
    console.error('Error in getWalletStats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getWalletUsageByPool = async (req, res) => {
  try {
    const { poolId } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20; // Increased default limit
    const { address, sortBy = 'lastTradeTime', sortOrder = 'desc' } = req.query;

    // Validate sort parameters
    const validSortFields = ['lastTradeTime', 'buyWeight', 'sellWeight', 'volume'];
    const validSortOrders = ['asc', 'desc'];

    const finalSortBy = validSortFields.includes(sortBy) ? sortBy : 'lastTradeTime';
    const finalSortOrder = validSortOrders.includes(sortOrder.toLowerCase()) ? sortOrder.toLowerCase() : 'desc';

    const options = {
      page,
      limit,
      sort: { [finalSortBy]: finalSortOrder === 'desc' ? -1 : 1 },
      lean: true,
    };

    const query = { pool: poolId };

    // Enhanced address search
    if (address) {
      // Remove common prefixes if present
      const cleanAddress = address.replace(/^0x/i, '').trim();
      if (cleanAddress) {
        query.address = {
          $regex: `^0x?${cleanAddress}`,
          $options: 'i',
        };
      }
    }

    const paginatedResults = await WalletUsage.paginate(query, {
      ...options,
      populate: 'wallet',
      select: 'address chainId buyWeight sellWeight volume lastTradeTime',
    });

    // Transform the results to include network and status from the populated wallet
    const results = paginatedResults.results.map((usage) => ({
      address: usage.address,
      chainId: usage.chainId,
      buyWeight: usage.buyWeight,
      sellWeight: usage.sellWeight,
      volume: usage.volume,
      lastTradeTime: usage.lastTradeTime,
      status: usage.wallet?.status,
    }));

    res.status(200).json({
      results,
      page: paginatedResults.page,
      limit: paginatedResults.limit,
      totalPages: paginatedResults.totalPages,
      totalResults: paginatedResults.totalResults,
      sortBy: finalSortBy,
      sortOrder: finalSortOrder,
    });
  } catch (error) {
    console.error('Error in getWalletUsageByPool:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  listWallets,
  getWalletStats,
  getWalletUsageByPool,
};
