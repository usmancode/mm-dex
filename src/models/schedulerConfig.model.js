const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');
const SchedulerTypes = require('../enums/schedulerTypes');

const schedulerConfigSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      enum: Object.values(SchedulerTypes), // restrict to known scheduler types
      description: "Name of the scheduler task (e.g., 'WalletGeneration', 'TokenDistribution')",
    },
    cronExpression: {
      type: String,
      required: true,
      description: 'Cron expression for scheduling',
    },
    description: {
      type: String,
      default: '',
      description: 'Description of the scheduler task',
    },
    enabled: {
      type: Boolean,
      default: true,
      description: 'If the scheduler is enabled',
    },
    nextRun: {
      type: Date,
      description: 'Next scheduled run time',
    },
    lastRun: {
      type: Date,
      description: 'Last time the scheduler ran',
    },
  },
  {
    timestamps: true,
  }
);

schedulerConfigSchema.plugin(toJSON);
schedulerConfigSchema.plugin(paginate);

const SchedulerConfig = mongoose.model('SchedulerConfig', schedulerConfigSchema);
module.exports = SchedulerConfig;
