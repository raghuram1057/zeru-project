# EigenLayer Restaking Data API

A comprehensive REST API service for aggregating and exposing EigenLayer restaking data. This service provides detailed information about restakers, validators, and reward insights by querying on-chain data and subgraphs.

## 🚀 Features

- **Restaker Information**: Track user restaking activities, amounts, and target operators
- **Validator Metadata**: Comprehensive validator data including stake, delegators, and slashing history
- **Reward Insights**: Detailed reward tracking with operator-specific breakdowns
- **Real-time Data**: Automated data fetching from EigenLayer subgraphs
- **Production Ready**: Comprehensive error handling, validation, and monitoring

## 📊 API Endpoints

### Restakers
- `GET /api/restakers` - Get all restakers with pagination
- `GET /api/restakers/:address` - Get specific restaker by address
- `GET /api/restakers/operator/:address` - Get restakers by operator
- `GET /api/restakers/stats` - Get restaker statistics

### Validators
- `GET /api/validators` - Get all validators with pagination
- `GET /api/validators/:address` - Get specific validator by address
- `GET /api/validators/top` - Get top validators by stake
- `GET /api/validators/stats` - Get validator statistics

### Rewards
- `GET /api/rewards/:address` - Get rewards for specific wallet address
- `GET /api/rewards/stats` - Get rewards statistics
- `GET /api/rewards/top` - Get top reward earners

### Health & Info
- `GET /health` - Health check endpoint
- `GET /api` - API documentation and endpoint listing

## 🛠 Setup Instructions

### Prerequisites
- Node.js 18+ 
- MongoDB 5.0+
- Ethereum RPC endpoint (Alchemy, Infura, etc.)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd eigenlayer-restaking-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start MongoDB**
   ```bash
   # Using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:5.0
   
   # Or start local MongoDB service
   sudo systemctl start mongod
   ```

5. **Run the application**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

6. **Fetch initial data**
   ```bash
   # Manual data fetch
   npm run fetch-data
   ```

## 📚 Data Sources

### Primary Sources
1. **EigenLayer Subgraph**: Main source for restaking, delegation, and operator data
   - Endpoint: `https://api.thegraph.com/subgraphs/name/eigenlayer/eigenlayer`
   - Data: Delegations, operators, slashing events

2. **Lido Subgraph**: stETH-specific restaking data
   - Endpoint: `https://api.thegraph.com/subgraphs/name/lido/lido-ethereum`
   - Data: stETH transfers and balances

3. **On-chain Data**: Direct smart contract interactions for real-time data
   - Contracts: Strategy Manager, Delegation Manager, Slasher
   - Data: Current state, events, and historical data

### Smart Contract Addresses (Mainnet)
- Strategy Manager: `0x858646372CC42E1A627fcE94aa7A7033e7CF075A`
- Delegation Manager: `0x39053D51B77DC0d36036Fc1fCc8Cb819df8Ef37A`
- Slasher: `0xD92145c07f8Ed1D392c1B88017934E301CC1c3Cd`

## 🏗 Architecture

### Project Structure
```
eigenlayer-restaking-api/
├── server.js              # Main application entry point
├── config/
│   └── database.js        # Database connection configuration
├── models/                # MongoDB schemas
│   ├── Restaker.js       # Restaker data model
│   ├── Validator.js      # Validator data model
│   └── Reward.js         # Reward data model
├── routes/               # API route definitions
│   ├── index.js         # Main router
│   ├── restakers.js     # Restaker routes
│   ├── validators.js    # Validator routes
│   └── rewards.js       # Reward routes
├── controllers/          # Business logic
│   ├── restakerController.js
│   ├── validatorController.js
│   └── rewardController.js
├── middleware/           # Custom middleware
│   ├── validation.js    # Input validation
│   └── errorHandler.js  # Error handling
├── scripts/             # Data fetching scripts
│   └── fetchData.js    # Main data aggregation script
└── utils/              # Utility functions
    ├── appError.js     # Custom error class
    └── catchAsync.js   # Async error handling
```

### Database Schema

#### Restakers Collection
```javascript
{
  userAddress: String,           // Ethereum address
  amountRestakedStETH: String,   // Amount in ETH
  targetAVSOperatorAddress: String,
  restakingTimestamp: Date,
  status: String,                // active, withdrawn, slashed
  lastUpdated: Date
}
```

#### Validators Collection
```javascript
{
  operatorAddress: String,
  operatorName: String,
  totalDelegatedStakeStETH: String,
  totalDelegators: Number,
  slashHistory: [{
    timestamp: Date,
    amountStETH: String,
    reason: String,
    transactionHash: String
  }],
  status: String,               // active, inactive, jailed, slashed
  commissionRate: Number,
  metadata: Object
}
```

#### Rewards Collection
```javascript
{
  walletAddress: String,
  totalRewardsReceivedStETH: String,
  rewardsBreakdown: [{
    operatorAddress: String,
    operatorName: String,
    amountStETH: String,
    timestamps: [Date],
    transactionHashes: [String]
  }],
  totalRewardEvents: Number
}
```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/eigenlayer-api` |
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment mode | `development` |
| `ETHEREUM_RPC_URL` | Ethereum RPC endpoint | Required |
| `AUTO_FETCH_DATA` | Enable automatic data fetching | `true` |
| `FETCH_INTERVAL_HOURS` | Data fetch interval | `6` |

### Data Fetching Configuration

The service automatically fetches data every 6 hours by default. You can configure this behavior:

```javascript
// In scripts/fetchData.js
cron.schedule('0 */6 * * *', () => {
  dataFetcher.fetchAllData();
});
```

## 📋 API Examples

### Get All Restakers
```bash
curl "http://localhost:3000/api/restakers?page=1&limit=10"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "userAddress": "0x123...",
      "amountRestakedStETH": "100.5",
      "targetAVSOperatorAddress": "0xabc...",
      "status": "active",
      "restakingTimestamp": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1500,
    "pages": 150
  }
}
```

### Get Validator Details
```bash
curl "http://localhost:3000/api/validators/0xabc..."
```

**Response:**
```json
{
  "success": true,
  "data": {
    "operatorAddress": "0xabc...",
    "operatorName": "Validator Name",
    "totalDelegatedStakeStETH": "5000.0",
    "totalDelegators": 250,
    "slashHistory": [
      {
        "timestamp": "2024-01-10T14:20:00.000Z",
        "amountStETH": "50.0",
        "reason": "Misconduct X",
        "transactionHash": "0xdef..."
      }
    ],
    "status": "active",
    "commissionRate": 5.0
  }
}
```

### Get Rewards for Address
```bash
curl "http://localhost:3000/api/rewards/0x123..."
```

**Response:**
```json
{
  "success": true,
  "data": {
    "walletAddress": "0x123...",
    "totalRewardsReceivedStETH": "75.2",
    "rewardsBreakdown": [
      {
        "operatorAddress": "0xabc...",
        "operatorName": "Validator A",
        "amountStETH": "60.0",
        "timestamps": ["2024-01-20T10:00:00.000Z", "2024-01-21T10:00:00.000Z"]
      }
    ],
    "totalRewardEvents": 15
  }
}
```

## 🔍 Monitoring & Logging

### Health Check
```bash
curl "http://localhost:3000/health"
```

### Logs
The application uses structured logging with different levels:
- `info`: General application flow
- `warn`: Potential issues
- `error`: Error conditions
- `debug`: Detailed debugging information

## 🚨 Error Handling

The API provides comprehensive error handling with appropriate HTTP status codes:

- `200`: Success
- `400`: Bad Request (validation errors)
- `404`: Not Found
- `500`: Internal Server Error

**Error Response Format:**
```json
{
  "success": false,
  "message": "Error description"
}
```

## 🔒 Security Features

- **Helmet.js**: Security headers
- **CORS**: Cross-origin request handling
- **Input Validation**: Joi schema validation
- **Rate Limiting**: Request throttling
- **Error Sanitization**: No sensitive data exposure

## 📈 Performance Optimizations

- **Database Indexing**: Optimized queries with proper indexes
- **Pagination**: Efficient data retrieval
- **Compression**: Response compression
- **Caching**: Planned Redis integration
- **Connection Pooling**: MongoDB connection optimization

## 🧪 Testing

### Manual Testing
```bash
# Test all endpoints
curl "http://localhost:3000/api"
curl "http://localhost:3000/api/restakers"
curl "http://localhost:3000/api/validators"
curl "http://localhost:3000/api/rewards/0x123..."
```

### Data Validation
```bash
# Trigger manual data fetch
npm run fetch-data

# Check data integrity
mongo eigenlayer-api --eval "db.restakers.count()"
mongo eigenlayer-api --eval "db.validators.count()"
mongo eigenlayer-api --eval "db.rewards.count()"
```

## 🚀 Deployment

### Production Deployment
1. **Environment Setup**
   ```bash
   export NODE_ENV=production
   export MONGODB_URI="mongodb://your-production-db"
   export ETHEREUM_RPC_URL="your-production-rpc"
   ```

2. **Process Management**
   ```bash
   # Using PM2
   npm install -g pm2
   pm2 start server.js --name "eigenlayer-api"
   pm2 startup
   pm2 save
   ```

3. **Reverse Proxy (Nginx)**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🔗 Links

- [EigenLayer Documentation](https://docs.eigenlayer.xyz/)
- [The Graph Documentation](https://thegraph.com/docs/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Express.js Documentation](https://expressjs.com/)

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the API documentation at `/api`
- Review the health check endpoint at `/health`

---

Built with ❤️ for the EigenLayer ecosystem