import mongoose from 'mongoose';

const slashHistorySchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    required: true
  },
  amountStETH: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    default: 'Unknown'
  },
  transactionHash: {
    type: String,
    match: /^0x[a-fA-F0-9]{64}$/
  }
}, { _id: false });

const validatorSchema = new mongoose.Schema({
  operatorAddress: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: /^0x[a-fA-F0-9]{40}$/
  },
  operatorName: {
    type: String,
    default: ''
  },
  totalDelegatedStakeStETH: {
    type: String,
    required: true,
    default: '0'
  },
  totalDelegators: {
    type: Number,
    default: 0
  },
  slashHistory: [slashHistorySchema],
  status: {
    type: String,
    enum: ['active', 'inactive', 'jailed', 'slashed'],
    default: 'active'
  },
  commissionRate: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  registrationTimestamp: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  metadata: {
    website: String,
    description: String,
    logo: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient querying
validatorSchema.index({ operatorAddress: 1 });
validatorSchema.index({ status: 1 });
validatorSchema.index({ totalDelegatedStakeStETH: -1 });
validatorSchema.index({ lastUpdated: -1 });

// Virtual for total slashed amount
validatorSchema.virtual('totalSlashedAmount').get(function() {
  return this.slashHistory.reduce((total, slash) => {
    return total + parseFloat(slash.amountStETH || '0');
  }, 0).toFixed(4);
});

// Virtual for formatted stake
validatorSchema.virtual('formattedStake').get(function() {
  return parseFloat(this.totalDelegatedStakeStETH).toFixed(4);
});

// Pre-save middleware
validatorSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

export default mongoose.model('Validator', validatorSchema);