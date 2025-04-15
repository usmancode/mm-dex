const TxnStatus = Object.freeze({
  PENDING: 'PENDING',
  INPROCESS: 'INPROCESS',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  // Add more types as needed in the future
});

module.exports = TxnStatus;
