import Joi from 'joi';
import { AppError } from '../utils/appError.js';
import { catchAsync } from '../utils/catchAsync.js';

// Ethereum address validation
const addressSchema = Joi.string()
  .pattern(/^0x[a-fA-F0-9]{40}$/)
  .required()
  .messages({
    'string.pattern.base': 'Invalid Ethereum address format'
  });

// Validate Ethereum address middleware
export const validateAddress = catchAsync(async (req, res, next) => {
  const { error } = addressSchema.validate(req.params.address);
  
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }
  
  next();
});

// Query parameter validation schemas
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'amount', 'timestamp'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

// Validate pagination middleware
export const validatePagination = catchAsync(async (req, res, next) => {
  const { error, value } = paginationSchema.validate(req.query);
  
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }
  
  req.query = { ...req.query, ...value };
  next();
});