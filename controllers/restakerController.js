import Restaker from '../models/Restaker.js';
import { AppError } from '../utils/appError.js';
import { catchAsync } from '../utils/catchAsync.js';

// Get all restakers with pagination and filtering
export const getAllRestakers = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;
  
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.operator) filter.targetAVSOperatorAddress = req.query.operator.toLowerCase();
  
  const [restakers, total] = await Promise.all([
    Restaker.find(filter)
      .sort({ amountRestakedStETH: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Restaker.countDocuments(filter)
  ]);
  
  res.json({
    success: true,
    data: restakers,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

// Get specific restaker by address
export const getRestakerByAddress = catchAsync(async (req, res) => {
  const { address } = req.params;
  
  const restaker = await Restaker.findOne({ 
    userAddress: address.toLowerCase() 
  }).lean();
  
  if (!restaker) {
    throw new AppError('Restaker not found', 404);
  }
  
  res.json({
    success: true,
    data: restaker
  });
});

// Get restakers by operator
export const getRestakersByOperator = catchAsync(async (req, res) => {
  const { address } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;
  
  const [restakers, total] = await Promise.all([
    Restaker.find({ 
      targetAVSOperatorAddress: address.toLowerCase() 
    })
      .sort({ amountRestakedStETH: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Restaker.countDocuments({ 
      targetAVSOperatorAddress: address.toLowerCase() 
    })
  ]);
  
  res.json({
    success: true,
    data: restakers,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

// Get restaker statistics
export const getRestakerStats = catchAsync(async (req, res) => {
  const stats = await Restaker.aggregate([
    {
      $group: {
        _id: null,
        totalRestakers: { $sum: 1 },
        totalStaked: { 
          $sum: { $toDouble: '$amountRestakedStETH' }
        },
        avgStaked: { 
          $avg: { $toDouble: '$amountRestakedStETH' }
        },
        activeRestakers: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        }
      }
    }
  ]);
  
  const statusBreakdown = await Restaker.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const topOperators = await Restaker.aggregate([
    {
      $group: {
        _id: '$targetAVSOperatorAddress',
        delegatorCount: { $sum: 1 },
        totalStaked: { $sum: { $toDouble: '$amountRestakedStETH' } }
      }
    },
    { $sort: { totalStaked: -1 } },
    { $limit: 10 }
  ]);
  
  res.json({
    success: true,
    data: {
      overview: stats[0] || {
        totalRestakers: 0,
        totalStaked: 0,
        avgStaked: 0,
        activeRestakers: 0
      },
      statusBreakdown,
      topOperators
    }
  });
});