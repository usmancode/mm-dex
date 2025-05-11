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

const getWalletTokenBalances = async (req, res) => {
  const { tokenA, tokenB, page = 1, limit = 10 } = req.query;

  if (!tokenA || !tokenB) {
    return res.status(400).json({ message: 'Both tokenA and tokenB are required' });
  }

  // Find both tokens
  const [tokenAInfo, tokenBInfo] = await Promise.all([
    CryptoToken.findOne({ tokenAddress: tokenA }),
    CryptoToken.findOne({ tokenAddress: tokenB }),
  ]);

  if (!tokenAInfo || !tokenBInfo) {
    return res.status(404).json({ message: 'One or both tokens not found' });
  }

  // Get all wallets with pagination and default sort by updatedAt
  const wallets = await Wallet.paginate(
    {},
    {
      page,
      limit,
      sort: { updatedAt: -1 },
      lean: true, // Use lean for better performance
    }
  );

  // Get balances for all wallets for both tokens
  const walletBalances = await Promise.all(
    wallets.results.map(async (wallet) => {
      const [balanceA, balanceB] = await Promise.all([
        Balance.findOne({ wallet: wallet._id, token: tokenAInfo._id }).sort({ updatedAt: -1 }),
        Balance.findOne({ wallet: wallet._id, token: tokenBInfo._id }).sort({ updatedAt: -1 }),
      ]);

      return {
        address: wallet.address,
        tokenABalance: balanceA ? balanceA.balance.toString() : '0',
        tokenBBalance: balanceB ? balanceB.balance.toString() : '0',
        status: wallet.status,
        updatedAt: wallet.updatedAt, // Include the last updated timestamp
      };
    })
  );

  res.json({
    results: walletBalances,
    page: wallets.page,
    limit: wallets.limit,
    totalPages: wallets.totalPages,
    totalResults: wallets.totalResults,
  });
};

module.exports = {
  listBalances,
  getWalletTokenBalances,
};
