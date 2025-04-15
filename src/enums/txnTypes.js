const TxnTypes = Object.freeze({
  SWAP: 'SWAP',
  REBALANCING: 'REBALANCING',
  GAS_TRANSFER: 'GAS_TRANSFER',
  TOKEN_TRANSFER: 'TOKEN_TRANSFER',
  GAS_REFILL: 'GAS_REFILL',
  APPROVE: 'APPROVE',
  // Add more types as needed in the future
});

module.exports = TxnTypes;
