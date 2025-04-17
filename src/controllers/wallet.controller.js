const Wallet = require('../models/wallet.model');
const WalletTypes = require('../enums/walletTypes'); // Make sure this path matches your project structure

const listWallets = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    const filter = {};
    if (req.query.type && Object.values(WalletTypes).includes(req.query.type)) {
      filter.type = req.query.type;
    }
    const options = { page, limit, sort: { createdAt: -1 } };

    const paginatedWallets = await Wallet.paginate(filter, options);

    // Remove hd_index from each returned wallet
    const sanitizedResults = paginatedWallets.results.map((walletDoc) => {
      const wallet = walletDoc.toJSON();
      delete wallet.hd_index;
      delete wallet.snapshot;
      return wallet;
    });

    res.status(200).json({
      ...paginatedWallets,
      results: sanitizedResults,
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  listWallets,
};
