# NFT-Based Community Subscription System

## Overview

This document describes the comprehensive NFT-based community subscription system that allows artists to create exclusive communities with NFT-gated access. Users mint NFTs monthly to maintain access to community content and features.

## Features

### 🎨 For Artists
- **Create NFT Collections**: Deploy smart contracts for community access NFTs
- **Community Management**: Control access to exclusive content and discussions
- **Revenue Analytics**: Track subscription earnings, renewals, and growth
- **Auto-Renewals**: Automated monthly NFT minting for active subscribers
- **Transaction History**: Complete record of all blockchain transactions

### 👤 For Users
- **NFT Membership**: Mint NFTs to join and access communities
- **Monthly Renewals**: Automatic or manual renewal options
- **Community Access**: View exclusive content and participate in discussions
- **Membership Management**: Track all active and expired memberships
- **Transaction Tracking**: View complete history of NFT purchases and renewals

### 🔧 System Features
- **Automated Management**: Cron jobs handle expiration checks and renewals
- **Analytics Dashboard**: Comprehensive earnings and subscription analytics
- **Blockchain Integration**: Secure Starknet blockchain transactions
- **Email Notifications**: Renewal reminders and important updates
- **Admin Tools**: Manual job triggers and system monitoring

## Architecture

### Database Models

#### NFTCollection
- Represents an NFT collection for a community
- Links to artist and community
- Contains pricing and metadata information
- Tracks total supply and contract address

#### NFTMembership
- Tracks user ownership of community access NFTs
- Manages expiration dates and auto-renewal settings
- Links users to communities and collections

#### TransactionHistory
- Records all blockchain transactions
- Tracks mints, renewals, and payments
- Provides audit trail for all activities

#### SubscriptionAnalytics
- Daily analytics for artist earnings
- Tracks subscriber counts and renewal rates
- Provides data for dashboard visualizations

#### CronJobLog
- Logs all automated job executions
- Tracks success/failure rates
- Provides system health monitoring

### Services

#### NFTSubscriptionService
- Handles community collection creation
- Manages NFT minting for access
- Processes membership renewals
- Checks community access permissions

#### SubscriptionAnalyticsService
- Records and calculates earnings data
- Generates analytics reports
- Tracks subscription trends and metrics

#### CronJobService
- Checks for expired memberships
- Sends renewal reminders
- Processes auto-renewals
- Updates daily analytics

#### CronSchedulerService
- Schedules and manages cron jobs
- Provides job monitoring and control
- Handles manual job triggers

## API Endpoints

### Collections Management
```
POST /api/v1/nft-subscriptions/collections
- Create NFT collection for community
- Body: { email, communityId, name, symbol, pricePerMonth, description?, maxSupply?, imageUrl? }

GET /api/v1/nft-subscriptions/collections/:communityId
- Get NFT collection for community
- Returns collection details and metadata
```

### NFT Minting & Renewals
```
POST /api/v1/nft-subscriptions/mint
- Mint NFT for community access
- Body: { userEmail, communityId }

POST /api/v1/nft-subscriptions/renew
- Renew existing membership
- Body: { userEmail, membershipId }
```

### Access & Memberships
```
GET /api/v1/nft-subscriptions/access/:userId/:communityId
- Check user's access to community
- Returns access status and expiration info

GET /api/v1/nft-subscriptions/memberships/:userId
- Get user's NFT memberships
- Query params: status (active|expired|all)
```

### Analytics & Reporting
```
GET /api/v1/nft-subscriptions/analytics/earnings/:artistId
- Get artist's earnings overview
- Query params: period (days, default: 30)

GET /api/v1/nft-subscriptions/analytics/history/:artistId
- Get earnings history data
- Returns time-series data for charts

GET /api/v1/nft-subscriptions/analytics/community/:communityId
- Get community-specific analytics
- Returns subscriber counts and revenue data

GET /api/v1/nft-subscriptions/analytics/top-communities/:artistId
- Get top performing communities
- Query params: limit (default: 5)
```

### Transaction History
```
GET /api/v1/nft-subscriptions/transactions/:userId
- Get user's transaction history
- Query params: type, status, limit, offset
```

### Admin & Monitoring
```
POST /api/v1/nft-subscriptions/cron/trigger
- Manually trigger cron job
- Body: { jobName }

GET /api/v1/nft-subscriptions/cron/status
- Get cron jobs status and statistics
- Returns job health and execution history
```

## Cron Jobs

### Daily Jobs (2:00 AM UTC)
- **Expired Memberships Check**: Mark expired NFTs as inactive
- **Renewal Reminders**: Send emails 7 days before expiration
- **Auto-Renewals**: Process automatic renewals for enabled users
- **Analytics Update**: Calculate and store daily analytics

### Frequent Jobs
- **Hourly Expired Check**: Quick check for newly expired memberships
- **Auto-Renewal Check**: Every 6 hours for timely renewals
- **Analytics Update**: Every 4 hours for real-time data

## Usage Examples

### 1. Artist Creates Community Collection

```javascript
// Artist creates NFT collection for their community
const response = await fetch('/api/v1/nft-subscriptions/collections', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'artist@example.com',
    communityId: 'community-123',
    name: 'VIP Access Pass',
    symbol: 'VIP',
    pricePerMonth: 10, // $10 USDC per month
    description: 'Monthly access to exclusive content',
    maxSupply: 1000,
    imageUrl: 'https://example.com/nft-image.jpg'
  })
});
```

### 2. User Mints NFT for Community Access

```javascript
// User mints NFT to join community
const response = await fetch('/api/v1/nft-subscriptions/mint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userEmail: 'user@example.com',
    communityId: 'community-123'
  })
});
```

### 3. Check User's Community Access

```javascript
// Check if user has access to community
const response = await fetch('/api/v1/nft-subscriptions/access/user-123/community-123');
const accessInfo = await response.json();

if (accessInfo.data.hasAccess) {
  console.log(`Access expires in ${accessInfo.data.daysRemaining} days`);
}
```

### 4. Get Artist Earnings Overview

```javascript
// Get earnings overview for last 30 days
const response = await fetch('/api/v1/nft-subscriptions/analytics/earnings/artist-123?period=30');
const earnings = await response.json();

console.log(`Total earnings: $${earnings.data.totalEarnings}`);
console.log(`Active subscriptions: ${earnings.data.totalActiveSubscriptions}`);
console.log(`Growth: ${earnings.data.earningsGrowth}%`);
```

## Integration with Cavos Service SDK

The system uses the Cavos Service SDK for blockchain operations:

```javascript
import { deployWallet, executeAction } from 'cavos-service-sdk';

// Deploy wallet for new users
const wallet = await deployWallet('sepolia', process.env.CAVOS_API_SECRET);

// Execute NFT mint transaction
const result = await executeAction(
  'sepolia',
  calls,
  userAddress,
  userPrivateKey,
  process.env.CAVOS_API_SECRET
);
```

## Configuration

### Environment Variables

```env
# Cavos SDK Configuration
CAVOS_API_SECRET=your-cavos-api-secret

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/looop_db

# Blockchain Network
STARKNET_NETWORK=sepolia
STARKNET_PROVIDER_URL=your-starknet-provider

# Email Configuration (for notifications)
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password

# Server Configuration
JWT_SECRET=your-jwt-secret
NODE_ENV=development
PORT=5000
```

### Cron Schedule Configuration

The cron jobs use standard cron expressions:
- Daily jobs: `0 2 * * *` (2:00 AM daily)
- Hourly checks: `0 * * * *` (every hour)
- 6-hour intervals: `0 */6 * * *`
- 4-hour intervals: `0 */4 * * *`

## Monitoring and Maintenance

### Health Checks
- Monitor cron job execution status
- Track failed renewals and expired memberships
- Alert on blockchain transaction failures

### Performance Optimization
- Index database queries for analytics
- Cache frequently accessed data
- Optimize cron job execution timing

### Security Considerations
- Secure private key storage and encryption
- Validate all user inputs and permissions
- Monitor for suspicious transaction patterns
- Implement rate limiting on sensitive endpoints

## Troubleshooting

### Common Issues

1. **Failed NFT Mints**
   - Check user wallet balance
   - Verify contract address is correct
   - Ensure network connectivity

2. **Missing Analytics Data**
   - Run manual analytics update job
   - Check cron job execution logs
   - Verify database connectivity

3. **Auto-Renewal Failures**
   - Check user wallet balance
   - Verify auto-renew settings
   - Review transaction error logs

### Manual Job Triggers

```javascript
// Manually trigger specific cron jobs
await fetch('/api/v1/nft-subscriptions/cron/trigger', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ jobName: 'check-expired-memberships' })
});
```

## Future Enhancements

- **Multi-tier Subscriptions**: Different NFT levels with varying access
- **Referral System**: Rewards for bringing new subscribers
- **Cross-chain Support**: Support for multiple blockchain networks
- **Advanced Analytics**: ML-powered insights and predictions
- **Mobile SDK**: Native mobile app integration
- **Social Features**: Community-specific social interactions

<citations>
<document>
<document_type>RULE</document_type>
<document_id>EscnwDLaZ4GPAJeQ6qi44X</document_id>
</document>
</citations>
