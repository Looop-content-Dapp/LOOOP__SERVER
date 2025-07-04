import { prisma } from '@/config/database';
import { Decimal } from '@prisma/client/runtime/library';

export interface SubscriptionAnalyticsData {
  artistId: string;
  communityId: string;
  collectionId: string;
  date: Date;
  newSubscribers: number;
  renewedSubscriptions: number;
  expiredSubscriptions: number;
  cancelledSubscriptions: number;
  totalActiveSubscriptions: number;
  revenue: number;
  currency: string;
}

export interface EarningsOverview {
  totalEarnings: number;
  totalActiveSubscriptions: number;
  newSubscribersThisMonth: number;
  renewalRate: number;
  nextPayoutDate: Date;
  earningsGrowth: number; // percentage change from previous period
  totalSubscribers: number;
  renewedSubscriptions: number;
}

export interface EarningsHistoryItem {
  date: string;
  earnings: number;
  newSubscribers: number;
  renewedSubscriptions: number;
  totalActiveSubscriptions: number;
}

/**
 * Service for managing subscription analytics and earnings
 */
export class SubscriptionAnalyticsService {
  /**
   * Record daily analytics for an artist's community
   * @param data - Analytics data to record
   */
  async recordDailyAnalytics(data: SubscriptionAnalyticsData): Promise<void> {
    try {
      await prisma.subscriptionAnalytics.upsert({
        where: {
          artistId_communityId_date: {
            artistId: data.artistId,
            communityId: data.communityId,
            date: data.date
          }
        },
        create: {
          artistId: data.artistId,
          communityId: data.communityId,
          collectionId: data.collectionId,
          date: data.date,
          newSubscribers: data.newSubscribers,
          renewedSubscriptions: data.renewedSubscriptions,
          expiredSubscriptions: data.expiredSubscriptions,
          cancelledSubscriptions: data.cancelledSubscriptions,
          totalActiveSubscriptions: data.totalActiveSubscriptions,
          revenue: data.revenue,
          currency: data.currency
        },
        update: {
          newSubscribers: data.newSubscribers,
          renewedSubscriptions: data.renewedSubscriptions,
          expiredSubscriptions: data.expiredSubscriptions,
          cancelledSubscriptions: data.cancelledSubscriptions,
          totalActiveSubscriptions: data.totalActiveSubscriptions,
          revenue: data.revenue,
          updatedAt: new Date()
        }
      });
    } catch (error: any) {
      console.error('Error recording daily analytics:', error);
      throw error;
    }
  }

  /**
   * Update analytics when a new subscription is created
   * @param artistId - Artist ID
   * @param communityId - Community ID
   * @param collectionId - Collection ID
   * @param revenue - Revenue amount
   * @param currency - Currency
   */
  async recordNewSubscription(
    artistId: string,
    communityId: string,
    collectionId: string,
    revenue: number,
    currency: string = 'USDC'
  ): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get current active subscriptions count
      const activeCount = await prisma.nFTMembership.count({
        where: {
          communityId,
          isActive: true,
          expiresAt: { gt: new Date() }
        }
      });

      await this.recordDailyAnalytics({
        artistId,
        communityId,
        collectionId,
        date: today,
        newSubscribers: 1,
        renewedSubscriptions: 0,
        expiredSubscriptions: 0,
        cancelledSubscriptions: 0,
        totalActiveSubscriptions: activeCount,
        revenue,
        currency
      });
    } catch (error: any) {
      console.error('Error recording new subscription analytics:', error);
    }
  }

  /**
   * Update analytics when a subscription is renewed
   * @param artistId - Artist ID
   * @param communityId - Community ID
   * @param collectionId - Collection ID
   * @param revenue - Revenue amount
   * @param currency - Currency
   */
  async recordRenewal(
    artistId: string,
    communityId: string,
    collectionId: string,
    revenue: number,
    currency: string = 'USDC'
  ): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get current active subscriptions count
      const activeCount = await prisma.nFTMembership.count({
        where: {
          communityId,
          isActive: true,
          expiresAt: { gt: new Date() }
        }
      });

      const existing = await prisma.subscriptionAnalytics.findUnique({
        where: {
          artistId_communityId_date: {
            artistId,
            communityId,
            date: today
          }
        }
      });

      if (existing) {
        await prisma.subscriptionAnalytics.update({
          where: { id: existing.id },
          data: {
            renewedSubscriptions: { increment: 1 },
            revenue: { increment: revenue },
            totalActiveSubscriptions: activeCount,
            updatedAt: new Date()
          }
        });
      } else {
        await this.recordDailyAnalytics({
          artistId,
          communityId,
          collectionId,
          date: today,
          newSubscribers: 0,
          renewedSubscriptions: 1,
          expiredSubscriptions: 0,
          cancelledSubscriptions: 0,
          totalActiveSubscriptions: activeCount,
          revenue,
          currency
        });
      }
    } catch (error: any) {
      console.error('Error recording renewal analytics:', error);
    }
  }

  /**
   * Get earnings overview for an artist
   * @param artistId - Artist ID
   * @param period - Period in days (default: 30)
   * @returns Earnings overview
   */
  async getEarningsOverview(artistId: string, period: number = 30): Promise<EarningsOverview> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - period);

      const previousStartDate = new Date(startDate);
      previousStartDate.setDate(previousStartDate.getDate() - period);

      // Get current period analytics
      const currentPeriodAnalytics = await prisma.subscriptionAnalytics.findMany({
        where: {
          artistId,
          date: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      // Get previous period analytics for growth calculation
      const previousPeriodAnalytics = await prisma.subscriptionAnalytics.findMany({
        where: {
          artistId,
          date: {
            gte: previousStartDate,
            lt: startDate
          }
        }
      });

      // Calculate totals for current period
      const totalEarnings = currentPeriodAnalytics.reduce(
        (sum, record) => sum + Number(record.revenue), 0
      );
      const newSubscribersThisMonth = currentPeriodAnalytics.reduce(
        (sum, record) => sum + record.newSubscribers, 0
      );
      const renewedSubscriptions = currentPeriodAnalytics.reduce(
        (sum, record) => sum + record.renewedSubscriptions, 0
      );

      // Get current active subscriptions across all communities
      const totalActiveSubscriptions = await prisma.nFTMembership.count({
        where: {
          community: { artistId },
          isActive: true,
          expiresAt: { gt: new Date() }
        }
      });

      // Get total unique subscribers for the artist
      const totalSubscribers = await prisma.nFTMembership.groupBy({
        by: ['userId'],
        where: {
          community: { artistId },
          isActive: true
        }
      });

      // Calculate renewal rate
      const totalExpired = currentPeriodAnalytics.reduce(
        (sum, record) => sum + record.expiredSubscriptions, 0
      );
      const renewalRate = totalExpired > 0 ? (renewedSubscriptions / totalExpired) * 100 : 0;

      // Calculate growth compared to previous period
      const previousEarnings = previousPeriodAnalytics.reduce(
        (sum, record) => sum + Number(record.revenue), 0
      );
      const earningsGrowth = previousEarnings > 0 
        ? ((totalEarnings - previousEarnings) / previousEarnings) * 100 
        : 0;

      // Calculate next payout date (15th of next month)
      const nextPayoutDate = new Date();
      nextPayoutDate.setMonth(nextPayoutDate.getMonth() + 1);
      nextPayoutDate.setDate(15);

      return {
        totalEarnings,
        totalActiveSubscriptions,
        newSubscribersThisMonth,
        renewalRate,
        nextPayoutDate,
        earningsGrowth,
        totalSubscribers: totalSubscribers.length,
        renewedSubscriptions
      };
    } catch (error: any) {
      console.error('Error getting earnings overview:', error);
      throw error;
    }
  }

  /**
   * Get earnings history for an artist
   * @param artistId - Artist ID
   * @param period - Period in days
   * @returns Earnings history
   */
  async getEarningsHistory(artistId: string, period: number = 30): Promise<EarningsHistoryItem[]> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - period);

      const analytics = await prisma.subscriptionAnalytics.findMany({
        where: {
          artistId,
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: { date: 'asc' }
      });

      // Group by date and sum up the values
      const groupedData = analytics.reduce((acc, record) => {
        const dateKey = record.date.toISOString().split('T')[0];
        
        if (!acc[dateKey]) {
          acc[dateKey] = {
            date: dateKey,
            earnings: 0,
            newSubscribers: 0,
            renewedSubscriptions: 0,
            totalActiveSubscriptions: 0
          };
        }

        acc[dateKey].earnings += Number(record.revenue);
        acc[dateKey].newSubscribers += record.newSubscribers;
        acc[dateKey].renewedSubscriptions += record.renewedSubscriptions;
        acc[dateKey].totalActiveSubscriptions = Math.max(
          acc[dateKey].totalActiveSubscriptions,
          record.totalActiveSubscriptions
        );

        return acc;
      }, {} as Record<string, EarningsHistoryItem>);

      return Object.values(groupedData);
    } catch (error: any) {
      console.error('Error getting earnings history:', error);
      throw error;
    }
  }

  /**
   * Get analytics for a specific community
   * @param communityId - Community ID
   * @param period - Period in days
   * @returns Community analytics
   */
  async getCommunityAnalytics(communityId: string, period: number = 30) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - period);

      const analytics = await prisma.subscriptionAnalytics.findMany({
        where: {
          communityId,
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          community: {
            select: {
              name: true,
              description: true,
              imageUrl: true
            }
          },
          collection: {
            select: {
              name: true,
              pricePerMonth: true,
              currency: true,
              totalSupply: true
            }
          }
        },
        orderBy: { date: 'desc' }
      });

      const totalRevenue = analytics.reduce((sum, record) => sum + Number(record.revenue), 0);
      const totalNewSubscribers = analytics.reduce((sum, record) => sum + record.newSubscribers, 0);
      const totalRenewals = analytics.reduce((sum, record) => sum + record.renewedSubscriptions, 0);

      // Get current active memberships
      const activeMemberships = await prisma.nFTMembership.count({
        where: {
          communityId,
          isActive: true,
          expiresAt: { gt: new Date() }
        }
      });

      return {
        community: analytics[0]?.community,
        collection: analytics[0]?.collection,
        totalRevenue,
        totalNewSubscribers,
        totalRenewals,
        activeMemberships,
        dailyAnalytics: analytics
      };
    } catch (error: any) {
      console.error('Error getting community analytics:', error);
      throw error;
    }
  }

  /**
   * Get top performing communities for an artist
   * @param artistId - Artist ID
   * @param limit - Number of communities to return
   * @returns Top communities by revenue
   */
  async getTopCommunities(artistId: string, limit: number = 5) {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const topCommunities = await prisma.subscriptionAnalytics.groupBy({
        by: ['communityId'],
        where: {
          artistId,
          date: { gte: thirtyDaysAgo }
        },
        _sum: {
          revenue: true,
          newSubscribers: true,
          renewedSubscriptions: true
        },
        _max: {
          totalActiveSubscriptions: true
        },
        orderBy: {
          _sum: {
            revenue: 'desc'
          }
        },
        take: limit
      });

      // Get community details
      const communitiesWithDetails = await Promise.all(
        topCommunities.map(async (community) => {
          const communityDetails = await prisma.community.findUnique({
            where: { id: community.communityId },
            include: {
              nftCollections: {
                where: { isActive: true },
                select: {
                  name: true,
                  pricePerMonth: true,
                  currency: true
                }
              }
            }
          });

          return {
            ...community,
            communityDetails
          };
        })
      );

      return communitiesWithDetails;
    } catch (error: any) {
      console.error('Error getting top communities:', error);
      throw error;
    }
  }

  /**
   * Get subscription trends for an artist
   * @param artistId - Artist ID
   * @param period - Period in days
   * @returns Subscription trends data
   */
  async getSubscriptionTrends(artistId: string, period: number = 30) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - period);

      const trends = await prisma.subscriptionAnalytics.findMany({
        where: {
          artistId,
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: { date: 'asc' }
      });

      // Calculate daily totals
      const dailyTrends = trends.reduce((acc, record) => {
        const dateKey = record.date.toISOString().split('T')[0];
        
        if (!acc[dateKey]) {
          acc[dateKey] = {
            date: dateKey,
            newSubscriptions: 0,
            renewals: 0,
            expirations: 0,
            cancellations: 0,
            netGrowth: 0,
            revenue: 0
          };
        }

        acc[dateKey].newSubscriptions += record.newSubscribers;
        acc[dateKey].renewals += record.renewedSubscriptions;
        acc[dateKey].expirations += record.expiredSubscriptions;
        acc[dateKey].cancellations += record.cancelledSubscriptions;
        acc[dateKey].revenue += Number(record.revenue);
        acc[dateKey].netGrowth += (record.newSubscribers + record.renewedSubscriptions) - 
                                  (record.expiredSubscriptions + record.cancelledSubscriptions);

        return acc;
      }, {} as Record<string, any>);

      return Object.values(dailyTrends);
    } catch (error: any) {
      console.error('Error getting subscription trends:', error);
      throw error;
    }
  }
}

export const subscriptionAnalyticsService = new SubscriptionAnalyticsService();
