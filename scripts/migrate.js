const { mongoose, connection } = require('mongoose');
const config = require('../src/config/config');
async function seedDefaultEntries() {
  await mongoose.connect(config.mongoose.url, {});
  console.log('Connected to MongoDB for seeding default entries.');
  await connection.db.collection('wallets').updateMany({}, [
    {
      $set: {
        type: {
          $cond: {
            if: { $eq: ['$type', 'master'] },
            then: 'MASTER',
            else: 'NORMAL',
          },
        },
      },
    },
    { $unset: 'is_master' },
  ]);
  console.log('Migration completed successfully.');
}

seedDefaultEntries();
