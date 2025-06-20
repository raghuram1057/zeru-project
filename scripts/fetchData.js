import axios from 'axios';
import Web3 from 'web3';
import cron from 'node-cron';
import Restaker from '../models/Restaker.js';
import Validator from '../models/Validator.js';
import Reward from '../models/Reward.js';
// Configuration
const SUBGRAPH_ENDPOINTS = {
  EIGENLAYER: 'https://api.thegraph.com/subgraphs/name/eigenlayer/eigenlayer',
  LIDO: 'https://api.thegraph.com/subgraphs/name/lido/lido-ethereum'
};

const ETHEREUM_RPC = process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.alchemyapi.io/v2/your-api-key';
const web3 = new Web3(ETHEREUM_RPC);

// EigenLayer contract addresses (mainnet)
const CONTRACTS = {
  STRATEGY_MANAGER: '0x858646372CC42E1A627fcE94aa7A7033e7CF075A',
  DELEGATION_MANAGER: '0x39053D51B77DC0d36036Fc1fCc8Cb819df8Ef37A',
  SLASHER: '0xD92145c07f8Ed1D392c1B88017934E301CC1c3Cd'
};

class DataFetcher {
  constructor() {
    this.isRunning = false;
  }

  async fetchFromSubgraph(endpoint, query) {
    try {
      const response = await axios.post(endpoint, {
        query: query
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      if (response.data.errors) {
        throw new Error(`Subgraph query error: ${JSON.stringify(response.data.errors)}`);
      }

      return response.data.data;
    } catch (error) {
      console.error(`Subgraph fetch error:`, error.message);
      throw error;
    }
  }

  async fetchRestakersData() {
    console.log('📊 Fetching restakers data...');
    
    const query = `
      query GetRestakers($first: Int!, $skip: Int!) {
        delegations(first: $first, skip: $skip, where: { shares_gt: "0" }) {
          id
          delegator
          operator
          shares
          createdAtBlock
          createdAtTimestamp
        }
        operators(first: 1000, where: { totalShares_gt: "0" }) {
          id
          address
          totalShares
          delegatorCount
          isActive
        }
      }
    `;

    try {
      let skip = 0;
      const first = 1000;
      let hasMore = true;

      while (hasMore) {
        const data = await this.fetchFromSubgraph(SUBGRAPH_ENDPOINTS.EIGENLAYER, query);
        
        if (!data.delegations || data.delegations.length === 0) {
          hasMore = false;
          continue;
        }

        // Process delegations (restakers)
        for (const delegation of data.delegations) {
          try {
            await Restaker.findOneAndUpdate(
              { userAddress: delegation.delegator.toLowerCase() },
              {
                userAddress: delegation.delegator.toLowerCase(),
                amountRestakedStETH: web3.utils.fromWei(delegation.shares, 'ether'),
                targetAVSOperatorAddress: delegation.operator.toLowerCase(),
                restakingTimestamp: new Date(parseInt(delegation.createdAtTimestamp) * 1000),
                status: 'active'
              },
              { upsert: true, new: true }
            );
          } catch (error) {
            console.error(`Error processing restaker ${delegation.delegator}:`, error.message);
          }
        }

        skip += first;
        hasMore = data.delegations.length === first;
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log('✅ Restakers data updated successfully');
    } catch (error) {
      console.error('❌ Error fetching restakers data:', error.message);
      throw error;
    }
  }

  async fetchValidatorsData() {
    console.log('📊 Fetching validators data...');
    
    const query = `
      query GetValidators($first: Int!, $skip: Int!) {
        operators(first: $first, skip: $skip, orderBy: totalShares, orderDirection: desc) {
          id
          address
          totalShares
          delegatorCount
          isActive
          createdAtBlock
          createdAtTimestamp
          metadata {
            name
            website
            description
            logo
          }
        }
        slashings(first: 1000, orderBy: timestamp, orderDirection: desc) {
          id
          operator
          amount
          timestamp
          reason
          transactionHash
        }
      }
    `;

    try {
      const data = await this.fetchFromSubgraph(SUBGRAPH_ENDPOINTS.EIGENLAYER, query);
      
      if (data.operators) {
        for (const operator of data.operators) {
          try {
            // Find slashing history for this operator
            const slashHistory = data.slashings
              .filter(slash => slash.operator.toLowerCase() === operator.address.toLowerCase())
              .map(slash => ({
                timestamp: new Date(parseInt(slash.timestamp) * 1000),
                amountStETH: web3.utils.fromWei(slash.amount, 'ether'),
                reason: slash.reason || 'Unknown',
                transactionHash: slash.transactionHash
              }));

            await Validator.findOneAndUpdate(
              { operatorAddress: operator.address.toLowerCase() },
              {
                operatorAddress: operator.address.toLowerCase(),
                operatorName: operator.metadata?.name || '',
                totalDelegatedStakeStETH: web3.utils.fromWei(operator.totalShares, 'ether'),
                totalDelegators: parseInt(operator.delegatorCount) || 0,
                slashHistory: slashHistory,
                status: operator.isActive ? 'active' : 'inactive',
                registrationTimestamp: new Date(parseInt(operator.createdAtTimestamp) * 1000),
                metadata: {
                  website: operator.metadata?.website || '',
                  description: operator.metadata?.description || '',
                  logo: operator.metadata?.logo || ''
                }
              },
              { upsert: true, new: true }
            );
          } catch (error) {
            console.error(`Error processing validator ${operator.address}:`, error.message);
          }
        }
      }

      console.log('✅ Validators data updated successfully');
    } catch (error) {
      console.error('❌ Error fetching validators data:', error.message);
      throw error;
    }
  }

  async fetchRewardsData() {
    console.log('📊 Fetching rewards data...');
    
    const query = `
      query GetRewards($first: Int!, $skip: Int!) {
        rewardClaims(first: $first, skip: $skip, orderBy: timestamp, orderDirection: desc) {
          id
          delegator
          operator
          amount
          timestamp
          transactionHash
        }
        delegations(first: 1000, where: { shares_gt: "0" }) {
          delegator
          operator
        }
      }
    `;

    try {
      let skip = 0;
      const first = 1000;
      let hasMore = true;

      while (hasMore) {
        const data = await this.fetchFromSubgraph(SUBGRAPH_ENDPOINTS.EIGENLAYER, query);
        
        if (!data.rewardClaims || data.rewardClaims.length === 0) {
          hasMore = false;
          continue;
        }

        // Group rewards by delegator
        const rewardsByDelegator = {};
        
        for (const claim of data.rewardClaims) {
          const delegator = claim.delegator.toLowerCase();
          const operator = claim.operator.toLowerCase();
          
          if (!rewardsByDelegator[delegator]) {
            rewardsByDelegator[delegator] = {
              totalRewards: 0,
              breakdown: {}
            };
          }
          
          if (!rewardsByDelegator[delegator].breakdown[operator]) {
            rewardsByDelegator[delegator].breakdown[operator] = {
              amount: 0,
              timestamps: [],
              transactionHashes: []
            };
          }
          
          const rewardAmount = parseFloat(web3.utils.fromWei(claim.amount, 'ether'));
          rewardsByDelegator[delegator].totalRewards += rewardAmount;
          rewardsByDelegator[delegator].breakdown[operator].amount += rewardAmount;
          rewardsByDelegator[delegator].breakdown[operator].timestamps.push(
            new Date(parseInt(claim.timestamp) * 1000)
          );
          rewardsByDelegator[delegator].breakdown[operator].transactionHashes.push(
            claim.transactionHash
          );
        }

        // Update rewards in database
        for (const [delegator, rewardData] of Object.entries(rewardsByDelegator)) {
          try {
            const rewardsBreakdown = Object.entries(rewardData.breakdown).map(([operator, data]) => ({
              operatorAddress: operator,
              operatorName: '', // Will be populated later
              amountStETH: data.amount.toString(),
              timestamps: data.timestamps,
              transactionHashes: data.transactionHashes
            }));

            await Reward.findOneAndUpdate(
              { walletAddress: delegator },
              {
                walletAddress: delegator,
                totalRewardsReceivedStETH: rewardData.totalRewards.toString(),
                rewardsBreakdown: rewardsBreakdown
              },
              { upsert: true, new: true }
            );
          } catch (error) {
            console.error(`Error processing rewards for ${delegator}:`, error.message);
          }
        }

        skip += first;
        hasMore = data.rewardClaims.length === first;
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log('✅ Rewards data updated successfully');
    } catch (error) {
      console.error('❌ Error fetching rewards data:', error.message);
      throw error;
    }
  }

  async fetchAllData() {
    if (this.isRunning) {
      console.log('⏳ Data fetching already in progress...');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting data fetch process...');
    
    try {
      await Promise.allSettled([
        this.fetchRestakersData(),
        this.fetchValidatorsData(),
        this.fetchRewardsData()
      ]);
      
      console.log('🎉 Data fetch completed successfully!');
    } catch (error) {
      console.error('💥 Data fetch failed:', error.message);
    } finally {
      this.isRunning = false;
    }
  }
}

// Initialize data fetcher
const dataFetcher = new DataFetcher();

// Export function to start data fetching
export const startDataFetching = () => {
  console.log('📅 Scheduling data fetching jobs...');
  
  // Fetch data immediately on startup
  setTimeout(() => {
    dataFetcher.fetchAllData();
  }, 5000);
  
  // Schedule regular updates (every 6 hours)
  cron.schedule('0 */6 * * *', () => {
    console.log('⏰ Scheduled data fetch triggered');
    dataFetcher.fetchAllData();
  });
  
  // Manual fetch endpoint for testing
  return {
    fetchNow: () => dataFetcher.fetchAllData(),
    isRunning: () => dataFetcher.isRunning
  };
};

// Export for direct usage
export default dataFetcher;