import express from 'express';
import { 
  getAllRestakers, 
  getRestakerByAddress,
  getRestakersByOperator,
  getRestakerStats 
} from '../controllers/restakerController.js';
import { validateAddress } from '../middleware/validation.js';

const router = express.Router();

// GET /api/restakers - Get all restakers
router.get('/', getAllRestakers);

// GET /api/restakers/stats - Get restaker statistics
router.get('/stats', getRestakerStats);

// GET /api/restakers/operator/:address - Get restakers by operator
router.get('/operator/:address', validateAddress, getRestakersByOperator);

// GET /api/restakers/:address - Get specific restaker
router.get('/:address', validateAddress, getRestakerByAddress);

export default router;