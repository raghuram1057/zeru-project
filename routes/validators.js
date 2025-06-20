import express from 'express';
import { 
  getAllValidators, 
  getValidatorByAddress,
  getValidatorStats,
  getTopValidators 
} from '../controllers/validatorController.js';
import { validateAddress } from '../middleware/validation.js';

const router = express.Router();

// GET /api/validators - Get all validators
router.get('/', getAllValidators);

// GET /api/validators/stats - Get validator statistics
router.get('/stats', getValidatorStats);

// GET /api/validators/top - Get top validators by stake
router.get('/top', getTopValidators);

// GET /api/validators/:address - Get specific validator
router.get('/:address', validateAddress, getValidatorByAddress);

export default router;