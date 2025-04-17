const Balance = require('../models/balance.model');
const CryptoToken = require('../models/cryptoToken.model');
const Wallet = require('../models/wallet.model');

const listBalances = async (req, res) => {
  const { tokenAddress, walletAddress, page = 1, limit = 10 } = req.query;
  const filter = {};

  if (tokenAddress) {
    // Find token by token_address
    const token = await CryptoToken.findOne({ tokenAddress: tokenAddress });
    if (!token) return res.status(404).json({ message: 'Token not found' });
    filter.token = token._id;
  }

  if (walletAddress) {
    // Find wallet by address
    const wallet = await Wallet.findOne({ address: walletAddress });
    if (!wallet) return res.status(404).json({ message: 'Wallet not found' });
    filter.wallet = wallet._id;
  }

  const paginatedBalances = await Balance.paginate(filter, {
    page,
    limit,
    populate: 'wallet,token',
    sort: { updatedAt: -1 },
  });

  const formattedResults = paginatedBalances.results.map((doc) => {
    const data = doc.toJSON();
    if (data.wallet) {
      const { hd_index, snapshot, ...restWallet } = data.wallet;
      data.wallet = restWallet;
    }
    return {
      ...data,
      balance: doc.balance.toString(),
    };
  });

  res.json({
    ...paginatedBalances,
    results: formattedResults,
  });
};

module.exports = {
  listBalances,
};
