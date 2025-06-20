import Validator from '../models/Validator.js';
import { AppError } from '../utils/appError.js';
import { catchAsync } from '../utils/catchAsync.js';

// Get all validators with pagination and filtering
export const getAllValidators = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;
  
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  
  const sortBy = req.query.sortBy || 'totalDelegatedStakeStETH';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
  
  const [validators, total] = await Promise.all([
    Validator.find(filter)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean(),
    Validator.countDocuments(filter)
  ]);
  
  res.json({
    success: true,
    data: validators,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

// Get specific validator by address
export const getValidatorByAddress = catchAsync(async (req, res) => {
  const { address } = req.params;
  
  const validator = await Validator.findOne({ 
    operatorAddress: address.toLowerCase() 
  }).lean();
  
  if (!validator) {
    throw new AppError('Validator not found', 404);
  }
  
  res.json({
    success: true,
    data: validator
  });
});

// Get validator statistics
export const getValidatorStats = catchAsync(async (req, res) => {
  const stats = await Validator.aggregate([
    {
      $group: {
        _id: null,
        totalValidators: { $sum: 1 },
        totalStaked: { 
          $sum: { $toDouble: '$totalDelegatedStakeStETH' }
        },
        avgStaked: { 
          $avg: { $toDouble: '$totalDelegatedStakeStETH' }
        },
        activeValidators: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        totalSlashEvents: {
          $sum: { $size: '$slashHistory' }
        }
      }
    }
  ]);
  
  const statusBreakdown = await Validator.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const slashingStats = await Validator.aggregate([
    { $unwind: '$slashHistory' },
    {
      $group: {
        _id: null,
        totalSlashed: { 
          $sum: { $toDouble: '$slashHistory.amountStETH' }
        },
        avgSlashAmount: { 
          $avg: { $toDouble: '$slashHistory.amountStETH' }
        }
      }
    }
  ]);
  
  res.json({
    success: true,
    data: {
      overview: stats[0] || {
        totalValidators: 0,
        totalStaked: 0,
        avgStaked: 0,
        activeValidators: 0,
        totalSlashEvents: 0
      },
      statusBreakdown,
      slashingStats: slashingStats[0] || {
        totalSlashed: 0,
        avgSlashAmount: 0
      }
    }
  });
});

// Get top validators by stake
export const getTopValidators = catchAsync(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  
  const topValidators = await Validator.find({ status: 'active' })
    .sort({ totalDelegatedStakeStETH: -1 })
    .limit(limit)
    .select('operatorAddress operatorName totalDelegatedStakeStETH totalDelegators commissionRate')
    .lean();
  
  res.json({
    success: true,
    data: topValidators
  });
});