import express from 'express';
import restakerRoutes from './restakers.js';
import validatorRoutes from './validators.js';
import rewardRoutes from './rewards.js';

const router = express.Router();

// API Documentation endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'EigenLayer Restaking Data API',
    version: '1.0.0',
    description: 'REST API for EigenLayer restaking data aggregation',
    endpoints: {
      restakers: {
        'GET /api/restakers': 'Get all restakers',
        'GET /api/restakers/:address': 'Get specific restaker by address'
      },
      validators: {
        'GET /api/validators': 'Get all validators',
        'GET /api/validators/:address': 'Get specific validator by address'
      },
      rewards: {
        'GET /api/rewards/:address': 'Get rewards for a specific wallet address'
      }
    },
    documentation: 'https://github.com/your-repo/eigenlayer-api#readme'
  });
});

// Route handlers
router.use('/restakers', restakerRoutes);
router.use('/validators', validatorRoutes);
router.use('/rewards', rewardRoutes);

export default router;