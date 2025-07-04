import { prisma } from '@/config/database';
import { nftSubscriptionService } from './starknet.service';
import { subscriptionAnalyticsService } from './subscriptionAnalytics.service';

export interface CronJobResult {
  jobName: string;
  status: 'success' | 'failed' | 'running';
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  processedItems: number;
  errorMessage?: string;
  metadata?: any;
}

/**
 * Service for managing cron jobs related to NFT subscriptions
 */
export class CronJobService {
  /**
   * Log cron job execution
   * @param result - Job execution result
   */
  private async logJobExecution(result: CronJobResult): Promise<void> {
    try {
      await prisma.cronJobLog.create({
        data: {
          jobName: result.jobName,
          status: result.status,
          startedAt: result.startedAt,
          completedAt: result.completedAt,
          duration: result.duration,
          processedItems: result.processedItems,
          errorMessage: result.errorMessage,
          metadata: result.metadata
        }
      });
    } catch (error: any) {
      console.error('Error logging cron job execution:', error);
    }
  }

  /**
   * Check for expired NFT memberships and update their status
   * Runs daily to mark expired memberships as inactive
   */
  async checkExpiredMemberships(): Promise<CronJobResult> {
    const startedAt = new Date();
    const jobName = 'check_expired_memberships';
    let processedItems = 0;
    let errorMessage: string | undefined;

    try {
      console.log('🔍 Starting expired memberships check...');

      // Find all memberships that have expired but are still marked as active
      const expiredMemberships = await prisma.nFTMembership.findMany({
        where: {
          isActive: true,
          expiresAt: { lt: new Date() }
        },
        include: {
          user: { select: { name: true, email: true } },
          community: { select: { name: true, artistId: true } },
          collection: { select: { name: true } }
        }
      });

      console.log(`Found ${expiredMemberships.length} expired memberships to process`);

      // Process each expired membership
      for (const membership of expiredMemberships) {
        try {
          // Mark membership as inactive
          await prisma.nFTMembership.update({
            where: { id: membership.id },
            data: { isActive: false }
          });

          // Update community member status
          await prisma.communityMember.updateMany({
            where: {
              userId: membership.userId,
              communityId: membership.communityId
            },
            data: { isActive: false }
          });

          processedItems++;
          console.log(`✅ Processed expired membership for ${membership.user.name} in ${membership.community.name}`);
        } catch (error: any) {
          console.error(`❌ Error processing membership ${membership.id}:`, error);
        }
      }

      // Update daily analytics for expired subscriptions
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Group expired memberships by community
      const expiredByCommunityCommunity = expiredMemberships.reduce((acc, membership) => {
        const key = membership.communityId;
        if (!acc[key]) {
          acc[key] = {
            communityId: membership.communityId,
            artistId: membership.community.artistId,
            collectionId: membership.collectionId,
            count: 0
          };
        }
        acc[key].count++;
        return acc;
      }, {} as Record<string, any>);

      // Update analytics for each community
      for (const data of Object.values(expiredByCommunityCommunity) as any[]) {
        try {
          const existing = await prisma.subscriptionAnalytics.findUnique({
            where: {
              artistId_communityId_date: {
                artistId: data.artistId,
                communityId: data.communityId,
                date: today
              }
            }
          });

          if (existing) {
            await prisma.subscriptionAnalytics.update({
              where: { id: existing.id },
              data: {
                expiredSubscriptions: { increment: data.count },
                updatedAt: new Date()
              }
            });
          } else {
            await subscriptionAnalyticsService.recordDailyAnalytics({
              artistId: data.artistId,
              communityId: data.communityId,
              collectionId: data.collectionId,
              date: today,
              newSubscribers: 0,
              renewedSubscriptions: 0,
              expiredSubscriptions: data.count,
              cancelledSubscriptions: 0,
              totalActiveSubscriptions: 0,
              revenue: 0,
              currency: 'USDC'
            });
          }
        } catch (error: any) {
          console.error('Error updating analytics for expired subscriptions:', error);
        }
      }

      const completedAt = new Date();
      const result: CronJobResult = {
        jobName,
        status: 'success',
        startedAt,
        completedAt,
        duration: completedAt.getTime() - startedAt.getTime(),
        processedItems,
        metadata: {
          expiredMemberships: expiredMemberships.length,
          communitiesAffected: Object.keys(expiredByCommunityCommunity).length
        }
      };

      await this.logJobExecution(result);
      console.log(`✅ Expired memberships check completed. Processed ${processedItems} items`);

      return result;
    } catch (error: any) {
      errorMessage = error.message;
      console.error('❌ Error in expired memberships check:', error);

      const result: CronJobResult = {
        jobName,
        status: 'failed',
        startedAt,
        completedAt: new Date(),
        duration: new Date().getTime() - startedAt.getTime(),
        processedItems,
        errorMessage
      };

      await this.logJobExecution(result);
      return result;
    }
  }

  /**
   * Send renewal reminders to users whose memberships are expiring soon
   * Runs daily to notify users 7 days before expiration
   */
  async sendRenewalReminders(): Promise<CronJobResult> {
    const startedAt = new Date();
    const jobName = 'send_renewal_reminders';
    let processedItems = 0;
    let errorMessage: string | undefined;

    try {
      console.log('📧 Starting renewal reminders check...');

      // Find memberships expiring in 7 days that haven't been reminded yet
      const reminderDate = new Date();
      reminderDate.setDate(reminderDate.getDate() + 7);

      const expiringMemberships = await prisma.nFTMembership.findMany({
        where: {
          isActive: true,
          reminderSent: false,
          expiresAt: {
            gte: new Date(), // Not expired yet
            lte: reminderDate // But expires within 7 days
          }
        },
        include: {
          user: { select: { name: true, email: true } },
          community: { 
            select: { 
              name: true, 
              imageUrl: true,
              artist: { select: { name: true } }
            } 
          },
          collection: { 
            select: { 
              name: true, 
              pricePerMonth: true, 
              currency: true 
            } 
          }
        }
      });

      console.log(`Found ${expiringMemberships.length} memberships requiring renewal reminders`);

      for (const membership of expiringMemberships) {
        try {
          // TODO: Implement email notification service
          // For now, we'll just log the reminder and mark it as sent
          console.log(`📧 Sending renewal reminder to ${membership.user.email} for ${membership.community.name}`);

          // Mark reminder as sent
          await prisma.nFTMembership.update({
            where: { id: membership.id },
            data: { reminderSent: true }
          });

          processedItems++;
        } catch (error: any) {
          console.error(`❌ Error sending reminder for membership ${membership.id}:`, error);
        }
      }

      const completedAt = new Date();
      const result: CronJobResult = {
        jobName,
        status: 'success',
        startedAt,
        completedAt,
        duration: completedAt.getTime() - startedAt.getTime(),
        processedItems,
        metadata: {
          remindersToSend: expiringMemberships.length
        }
      };

      await this.logJobExecution(result);
      console.log(`✅ Renewal reminders completed. Processed ${processedItems} items`);

      return result;
    } catch (error: any) {
      errorMessage = error.message;
      console.error('❌ Error in renewal reminders:', error);

      const result: CronJobResult = {
        jobName,
        status: 'failed',
        startedAt,
        completedAt: new Date(),
        duration: new Date().getTime() - startedAt.getTime(),
        processedItems,
        errorMessage
      };

      await this.logJobExecution(result);
      return result;
    }
  }

  /**
   * Auto-renew memberships for users who have auto-renew enabled
   * Runs daily to renew memberships that expire within 24 hours
   */
  async autoRenewMemberships(): Promise<CronJobResult> {
    const startedAt = new Date();
    const jobName = 'auto_renew_memberships';
    let processedItems = 0;
    let errorMessage: string | undefined;

    try {
      console.log('🔄 Starting auto-renewal check...');

      // Find memberships that expire within 24 hours and have auto-renew enabled
      const renewalDate = new Date();
      renewalDate.setDate(renewalDate.getDate() + 1);

      const membershipsToRenew = await prisma.nFTMembership.findMany({
        where: {
          isActive: true,
          autoRenew: true,
          expiresAt: {
            gte: new Date(), // Not expired yet
            lte: renewalDate // But expires within 24 hours
          }
        },
        include: {
          user: { select: { name: true, email: true } },
          community: { 
            select: { 
              name: true,
              artistId: true
            } 
          },
          collection: { 
            select: { 
              name: true, 
              pricePerMonth: true, 
              currency: true 
            } 
          }
        }
      });

      console.log(`Found ${membershipsToRenew.length} memberships to auto-renew`);

      for (const membership of membershipsToRenew) {
        try {
          console.log(`🔄 Auto-renewing membership for ${membership.user.email} in ${membership.community.name}`);

          // Attempt to renew the membership
          const renewalResult = await nftSubscriptionService.renewMembership(
            membership.user.email,
            membership.id
          );

          // Record analytics for the renewal
          await subscriptionAnalyticsService.recordRenewal(
            membership.community.artistId,
            membership.communityId,
            membership.collectionId,
            Number(membership.collection.pricePerMonth),
            membership.collection.currency
          );

          processedItems++;
          console.log(`✅ Successfully renewed membership for ${membership.user.email}`);
        } catch (error: any) {
          console.error(`❌ Error auto-renewing membership ${membership.id}:`, error);
          
          // Disable auto-renew if renewal fails
          await prisma.nFTMembership.update({
            where: { id: membership.id },
            data: { autoRenew: false }
          });
        }
      }

      const completedAt = new Date();
      const result: CronJobResult = {
        jobName,
        status: 'success',
        startedAt,
        completedAt,
        duration: completedAt.getTime() - startedAt.getTime(),
        processedItems,
        metadata: {
          membershipsToRenew: membershipsToRenew.length,
          successfulRenewals: processedItems,
          failedRenewals: membershipsToRenew.length - processedItems
        }
      };

      await this.logJobExecution(result);
      console.log(`✅ Auto-renewal completed. Successfully renewed ${processedItems} memberships`);

      return result;
    } catch (error: any) {
      errorMessage = error.message;
      console.error('❌ Error in auto-renewal:', error);

      const result: CronJobResult = {
        jobName,
        status: 'failed',
        startedAt,
        completedAt: new Date(),
        duration: new Date().getTime() - startedAt.getTime(),
        processedItems,
        errorMessage
      };

      await this.logJobExecution(result);
      return result;
    }
  }

  /**
   * Update daily subscription analytics
   * Runs daily to calculate and store analytics data
   */
  async updateDailyAnalytics(): Promise<CronJobResult> {
    const startedAt = new Date();
    const jobName = 'update_daily_analytics';
    let processedItems = 0;
    let errorMessage: string | undefined;

    try {
      console.log('📊 Starting daily analytics update...');

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get all active NFT collections
      const collections = await prisma.nFTCollection.findMany({
        where: { isActive: true },
        include: {
          community: true
        }
      });

      for (const collection of collections) {
        try {
          // Get current active subscriptions for this collection
          const activeSubscriptions = await prisma.nFTMembership.count({
            where: {
              collectionId: collection.id,
              isActive: true,
              expiresAt: { gt: new Date() }
            }
          });

          // Check if analytics already exist for today
          const existing = await prisma.subscriptionAnalytics.findUnique({
            where: {
              artistId_communityId_date: {
                artistId: collection.artistId,
                communityId: collection.communityId,
                date: today
              }
            }
          });

          if (!existing) {
            // Create analytics record with current active subscription count
            await subscriptionAnalyticsService.recordDailyAnalytics({
              artistId: collection.artistId,
              communityId: collection.communityId,
              collectionId: collection.id,
              date: today,
              newSubscribers: 0,
              renewedSubscriptions: 0,
              expiredSubscriptions: 0,
              cancelledSubscriptions: 0,
              totalActiveSubscriptions: activeSubscriptions,
              revenue: 0,
              currency: collection.currency
            });
          } else {
            // Update existing record with current active subscription count
            await prisma.subscriptionAnalytics.update({
              where: { id: existing.id },
              data: {
                totalActiveSubscriptions: activeSubscriptions,
                updatedAt: new Date()
              }
            });
          }

          processedItems++;
        } catch (error: any) {
          console.error(`❌ Error updating analytics for collection ${collection.id}:`, error);
        }
      }

      const completedAt = new Date();
      const result: CronJobResult = {
        jobName,
        status: 'success',
        startedAt,
        completedAt,
        duration: completedAt.getTime() - startedAt.getTime(),
        processedItems,
        metadata: {
          collectionsProcessed: collections.length
        }
      };

      await this.logJobExecution(result);
      console.log(`✅ Daily analytics update completed. Processed ${processedItems} collections`);

      return result;
    } catch (error: any) {
      errorMessage = error.message;
      console.error('❌ Error in daily analytics update:', error);

      const result: CronJobResult = {
        jobName,
        status: 'failed',
        startedAt,
        completedAt: new Date(),
        duration: new Date().getTime() - startedAt.getTime(),
        processedItems,
        errorMessage
      };

      await this.logJobExecution(result);
      return result;
    }
  }

  /**
   * Run all daily cron jobs
   * This method should be called once per day
   */
  async runDailyCronJobs(): Promise<{
    expiredMemberships: CronJobResult;
    renewalReminders: CronJobResult;
    autoRenewals: CronJobResult;
    dailyAnalytics: CronJobResult;
  }> {
    console.log('🚀 Starting daily cron jobs...');

    const results = {
      expiredMemberships: await this.checkExpiredMemberships(),
      renewalReminders: await this.sendRenewalReminders(),
      autoRenewals: await this.autoRenewMemberships(),
      dailyAnalytics: await this.updateDailyAnalytics()
    };

    console.log('✅ All daily cron jobs completed');
    return results;
  }

  /**
   * Get cron job execution history
   * @param jobName - Optional job name filter
   * @param limit - Number of records to return
   * @returns Job execution history
   */
  async getJobHistory(jobName?: string, limit: number = 50) {
    try {
      const history = await prisma.cronJobLog.findMany({
        where: jobName ? { jobName } : undefined,
        orderBy: { startedAt: 'desc' },
        take: limit
      });

      return history;
    } catch (error: any) {
      console.error('Error getting job history:', error);
      return [];
    }
  }

  /**
   * Get cron job statistics
   * @param days - Number of days to look back
   * @returns Job statistics
   */
  async getJobStatistics(days: number = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const statistics = await prisma.cronJobLog.groupBy({
        by: ['jobName', 'status'],
        where: {
          startedAt: { gte: startDate }
        },
        _count: {
          id: true
        },
        _avg: {
          duration: true,
          processedItems: true
        }
      });

      return statistics;
    } catch (error: any) {
      console.error('Error getting job statistics:', error);
      return [];
    }
  }
}

export const cronJobService = new CronJobService();
