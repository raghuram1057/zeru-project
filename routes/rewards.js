import express from 'express';
import { 
  getRewardsByAddress,
  getRewardsStats,
  getTopRewardEarners 
} from '../controllers/rewardController.js';
import { validateAddress } from '../middleware/validation.js';

const router = express.Router();

// GET /api/rewards/stats - Get rewards statistics
router.get('/stats', getRewardsStats);

// GET /api/rewards/top - Get top reward earners
router.get('/top', getTopRewardEarners);

// GET /api/rewards/:address - Get rewards for specific address
router.get('/:address', validateAddress, getRewardsByAddress);

export default router;