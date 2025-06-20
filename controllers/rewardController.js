import Reward from '../models/Reward.js';
import { AppError } from '../utils/appError.js';
import { catchAsync } from '../utils/catchAsync.js';

// Get rewards for specific address
export const getRewardsByAddress = catchAsync(async (req, res) => {
  const { address } = req.params;
  
  const rewards = await Reward.findOne({ 
    walletAddress: address.toLowerCase() 
  }).lean();
  
  if (!rewards) {
    throw new AppError('No rewards found for this address', 404);
  }
  
  res.json({
    success: true,
    data: rewards
  });
});

// Get rewards statistics
export const getRewardsStats = catchAsync(async (req, res) => {
  const stats = await Reward.aggregate([
    {
      $group: {
        _id: null,
        totalWallets: { $sum: 1 },
        totalRewards: { 
          $sum: { $toDouble: '$totalRewardsReceivedStETH' }
        },
        avgRewards: { 
          $avg: { $toDouble: '$totalRewardsReceivedStETH' }
        },
        totalRewardEvents: { $sum: '$totalRewardEvents' }
      }
    }
  ]);
  
  const operatorRewardsStats = await Reward.aggregate([
    { $unwind: '$rewardsBreakdown' },
    {
      $group: {
        _id: '$rewardsBreakdown.operatorAddress',
        operatorName: { $first: '$rewardsBreakdown.operatorName' },
        totalRewards: { 
          $sum: { $toDouble: '$rewardsBreakdown.amountStETH' }
        },
        totalWallets: { $sum: 1 }
      }
    },
    { $sort: { totalRewards: -1 } },
    { $limit: 10 }
  ]);
  
  const rewardDistribution = await Reward.aggregate([
    {
      $bucket: {
        groupBy: { $toDouble: '$totalRewardsReceivedStETH' },
        boundaries: [0, 1, 10, 100, 1000, 10000],
        default: '10000+',
        output: {
          count: { $sum: 1 },
          range: { $first: '$$ROOT' }
        }
      }
    }
  ]);
  
  res.json({
    success: true,
    data: {
      overview: stats[0] || {
        totalWallets: 0,
        totalRewards: 0,
        avgRewards: 0,
        totalRewardEvents: 0
      },
      topOperatorsByRewards: operatorRewardsStats,
      rewardDistribution
    }
  });
});

// Get top reward earners
export const getTopRewardEarners = catchAsync(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  
  const topEarners = await Reward.find()
    .sort({ totalRewardsReceivedStETH: -1 })
    .limit(limit)
    .select('walletAddress totalRewardsReceivedStETH totalRewardEvents lastRewardTimestamp')
    .lean();
  
  res.json({
    success: true,
    data: topEarners
  });
});