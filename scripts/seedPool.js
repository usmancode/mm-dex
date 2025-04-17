// scripts/seedPool.js

require('dotenv').config();
const mongoose = require('mongoose');
const Pool = require('../src/models/pool.model');
const config = require('../src/config/config');
const { min } = require('moment/moment');

async function main() {
  try {
    // 1. Connect to MongoDB
    await mongoose.connect(config.mongoose.url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('🗄️  Connected to MongoDB');

    // 2. Define your pool data (using ObjectId references for tokens)
    const poolData = {
      poolAddress: '0x0cc9392147a80e1ffa0cea59b12cc0d6ed508754',
      protocol: 'uniswap',
      chainId: 8453,
      token0: new mongoose.Types.ObjectId('67d9fec8162129697215c97e'),
      token1: new mongoose.Types.ObjectId('67d9fec8162129697215c981'),
      feeTier: 3000,
      active: true,
      slippageTolerance: 1.5,
      minNativeForGas: 7000000000000,
    };

    // 3. Upsert the pool document
    const existing = await Pool.findOne({ poolAddress: poolData.poolAddress });
    if (existing) {
      console.log('⚠️  Pool already exists, updating it');
      Object.assign(existing, poolData);
      await existing.save();
      console.log('✅  Pool updated:', existing);
    } else {
      const pool = new Pool(poolData);
      await pool.save();
      console.log('✅  New pool inserted:', pool);
    }
  } catch (err) {
    console.error('❌ Error while seeding pool:', err);
  } finally {
    // 4. Disconnect
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

main();
