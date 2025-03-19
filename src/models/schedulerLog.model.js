const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const schedulerLogSchema = mongoose.Schema({
  schedulerConfig: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SchedulerConfig',
    required: true,
    description: "Reference to the scheduler configuration"
  },
  startTime: {
    type: Date,
    required: true,
    description: "Start time of the cron job"
  },
  endTime: {
    type: Date,
    required: true,
    description: "End time of the cron job"
  },
  affectedRows: {
    type: Number,
    default: 0,
    description: "Number of affected rows or addresses generated"
  },
  message: {
    type: String,
    default: "",
    description: "Status or error message"
  },
  success: {
    type: Boolean,
    required: true,
    default: false,
    description: "Indicates whether the scheduler job completed successfully"
  }
}, {
  timestamps: true,
});

schedulerLogSchema.plugin(toJSON);
schedulerLogSchema.plugin(paginate);

const SchedulerLog = mongoose.model('SchedulerLog', schedulerLogSchema);
module.exports = SchedulerLog;
