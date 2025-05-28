const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');
const SchedulerTypes = require('../enums/schedulerTypes');
const SchedulerLog = require('./schedulerLog.model');

const schedulerConfigSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      enum: Object.values(SchedulerTypes),
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
    lastModified: { type: Date, default: Date.now },
    version: { type: Number, default: 1 },
    triggerImmediately: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// Pre-remove middleware to check for references
schedulerConfigSchema.pre('remove', async function (next) {
  const configId = this._id;

  try {
    // Check for references in other collections
    const schedulerLogRefs = await SchedulerLog.findOne({ schedulerConfig: configId });

    if (schedulerLogRefs) {
      const error = new Error('Cannot delete scheduler config as it is referenced in other collections');
      error.references = {
        hasSchedulerLogReferences: true,
      };
      return next(error);
    }

    next();
  } catch (error) {
    next(error);
  }
});

// Also add pre-findOneAndDelete middleware for findOneAndDelete operations
schedulerConfigSchema.pre('findOneAndDelete', async function (next) {
  const configId = this.getQuery()._id;

  try {
    // Check for references in other collections
    const schedulerLogRefs = await SchedulerLog.findOne({ schedulerConfig: configId });

    if (schedulerLogRefs) {
      const error = new Error('Cannot delete scheduler config as it is referenced in other collections');
      error.references = {
        hasSchedulerLogReferences: true,
      };
      return next(error);
    }

    next();
  } catch (error) {
    next(error);
  }
});

schedulerConfigSchema.plugin(toJSON);
schedulerConfigSchema.plugin(paginate);

const SchedulerConfig = mongoose.model('SchedulerConfig', schedulerConfigSchema);
module.exports = SchedulerConfig;
