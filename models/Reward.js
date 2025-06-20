import mongoose from 'mongoose';

const rewardBreakdownSchema = new mongoose.Schema({
  operatorAddress: {
    type: String,
    required: true,
    lowercase: true,
    match: /^0x[a-fA-F0-9]{40}$/
  },
  operatorName: {
    type: String,
    default: ''
  },
  amountStETH: {
    type: String,
    required: true,
    default: '0'
  },
  timestamps: [{
    type: Date,
    required: true
  }],
  transactionHashes: [{
    type: String,
    match: /^0x[a-fA-F0-9]{64}$/
  }]
}, { _id: false });

const rewardSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: /^0x[a-fA-F0-9]{40}$/
  },
  totalRewardsReceivedStETH: {
    type: String,
    required: true,
    default: '0'
  },
  rewardsBreakdown: [rewardBreakdownSchema],
  firstRewardTimestamp: {
    type: Date
  },
  lastRewardTimestamp: {
    type: Date
  },
  totalRewardEvents: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient querying
rewardSchema.index({ walletAddress: 1 });
rewardSchema.index({ totalRewardsReceivedStETH: -1 });
rewardSchema.index({ lastUpdated: -1 });
rewardSchema.index({ 'rewardsBreakdown.operatorAddress': 1 });

// Virtual for formatted total rewards
rewardSchema.virtual('formattedTotalRewards').get(function() {
  return parseFloat(this.totalRewardsReceivedStETH).toFixed(4);
});

// Virtual for average reward per event
rewardSchema.virtual('averageRewardPerEvent').get(function() {
  if (this.totalRewardEvents === 0) return '0';
  return (parseFloat(this.totalRewardsReceivedStETH) / this.totalRewardEvents).toFixed(4);
});

// Pre-save middleware
rewardSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  
  // Update first/last reward timestamps
  const allTimestamps = this.rewardsBreakdown.flatMap(breakdown => breakdown.timestamps);
  if (allTimestamps.length > 0) {
    this.firstRewardTimestamp = new Date(Math.min(...allTimestamps.map(t => t.getTime())));
    this.lastRewardTimestamp = new Date(Math.max(...allTimestamps.map(t => t.getTime())));
  }
  
  // Update total reward events
  this.totalRewardEvents = allTimestamps.length;
  
  next();
});

export default mongoose.model('Reward', rewardSchema);