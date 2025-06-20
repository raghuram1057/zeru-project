import mongoose from 'mongoose';

const restakerSchema = new mongoose.Schema({
  userAddress: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: /^0x[a-fA-F0-9]{40}$/
  },
  amountRestakedStETH: {
    type: String,
    required: true,
    default: '0'
  },
  targetAVSOperatorAddress: {
    type: String,
    required: true,
    lowercase: true,
    match: /^0x[a-fA-F0-9]{40}$/
  },
  restakingTimestamp: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'withdrawn', 'slashed'],
    default: 'active'
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
restakerSchema.index({ userAddress: 1 });
restakerSchema.index({ targetAVSOperatorAddress: 1 });
restakerSchema.index({ status: 1 });
restakerSchema.index({ lastUpdated: -1 });

// Virtual for formatted amount
restakerSchema.virtual('formattedAmount').get(function() {
  return parseFloat(this.amountRestakedStETH).toFixed(4);
});

// Pre-save middleware to update lastUpdated
restakerSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

export default mongoose.model('Restaker', restakerSchema);