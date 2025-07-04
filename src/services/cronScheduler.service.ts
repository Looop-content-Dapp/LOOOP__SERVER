import * as cron from 'node-cron';
import { cronJobService } from './cronJob.service';

/**
 * Service for scheduling and managing cron jobs
 */
export class CronSchedulerService {
  private scheduledJobs: Map<string, cron.ScheduledTask> = new Map();

  /**
   * Initialize all cron jobs
   */
  public initializeCronJobs(): void {
    console.log('🚀 Initializing cron jobs for NFT subscription management...');

    // Daily jobs at 2:00 AM
    this.scheduleJob('daily-jobs', '0 2 * * *', async () => {
      console.log('🕐 Running daily cron jobs...');
      try {
        await cronJobService.runDailyCronJobs();
        console.log('✅ Daily cron jobs completed successfully');
      } catch (error: any) {
        console.error('❌ Error running daily cron jobs:', error);
      }
    });

    // Hourly membership check (for testing and immediate response)
    this.scheduleJob('hourly-expired-check', '0 * * * *', async () => {
      console.log('🕐 Running hourly expired memberships check...');
      try {
        await cronJobService.checkExpiredMemberships();
        console.log('✅ Hourly expired memberships check completed');
      } catch (error: any) {
        console.error('❌ Error in hourly expired memberships check:', error);
      }
    });

    // Auto-renewal check every 6 hours
    this.scheduleJob('auto-renew-check', '0 */6 * * *', async () => {
      console.log('🔄 Running auto-renewal check...');
      try {
        await cronJobService.autoRenewMemberships();
        console.log('✅ Auto-renewal check completed');
      } catch (error: any) {
        console.error('❌ Error in auto-renewal check:', error);
      }
    });

    // Analytics update every 4 hours
    this.scheduleJob('analytics-update', '0 */4 * * *', async () => {
      console.log('📊 Running analytics update...');
      try {
        await cronJobService.updateDailyAnalytics();
        console.log('✅ Analytics update completed');
      } catch (error: any) {
        console.error('❌ Error in analytics update:', error);
      }
    });

    console.log(`✅ Initialized ${this.scheduledJobs.size} cron jobs`);
    this.listScheduledJobs();
  }

  /**
   * Schedule a new cron job
   * @param name - Job name
   * @param schedule - Cron schedule expression
   * @param task - Task function to execute
   * @param timezone - Timezone (default: system timezone)
   */
  public scheduleJob(
    name: string,
    schedule: string,
    task: () => Promise<void>,
    timezone?: string
  ): void {
    try {
      // Stop existing job with same name if it exists
      if (this.scheduledJobs.has(name)) {
        this.stopJob(name);
      }

      const scheduledTask = cron.schedule(
        schedule,
        async () => {
          console.log(`🔄 Executing scheduled job: ${name}`);
          const startTime = Date.now();
          
          try {
            await task();
            const duration = Date.now() - startTime;
            console.log(`✅ Job ${name} completed in ${duration}ms`);
          } catch (error: any) {
            const duration = Date.now() - startTime;
            console.error(`❌ Job ${name} failed after ${duration}ms:`, error);
          }
        },
        {
          scheduled: false,
          timezone: timezone || 'UTC'
        }
      );

      this.scheduledJobs.set(name, scheduledTask);
      scheduledTask.start();

      console.log(`📅 Scheduled job '${name}' with schedule '${schedule}'`);
    } catch (error: any) {
      console.error(`❌ Error scheduling job '${name}':`, error);
    }
  }

  /**
   * Stop a scheduled job
   * @param name - Job name
   */
  public stopJob(name: string): boolean {
    const job = this.scheduledJobs.get(name);
    if (job) {
      job.stop();
      this.scheduledJobs.delete(name);
      console.log(`🛑 Stopped job: ${name}`);
      return true;
    }
    console.warn(`⚠️ Job not found: ${name}`);
    return false;
  }

  /**
   * Start a stopped job
   * @param name - Job name
   */
  public startJob(name: string): boolean {
    const job = this.scheduledJobs.get(name);
    if (job) {
      job.start();
      console.log(`▶️ Started job: ${name}`);
      return true;
    }
    console.warn(`⚠️ Job not found: ${name}`);
    return false;
  }

  /**
   * Get status of all scheduled jobs
   */
  public getJobsStatus(): Array<{
    name: string;
    isRunning: boolean;
    nextRun?: string;
  }> {
    const status: Array<{
      name: string;
      isRunning: boolean;
      nextRun?: string;
    }> = [];

    this.scheduledJobs.forEach((job, name) => {
      // Since we can't access the internal state, we'll assume it's running if it exists
      status.push({
        name,
        isRunning: true, // All scheduled jobs are considered running
        nextRun: 'Scheduled' // Placeholder since we can't access nextDates
      });
    });

    return status;
  }

  /**
   * List all scheduled jobs
   */
  public listScheduledJobs(): void {
    console.log('📋 Currently scheduled jobs:');
    this.scheduledJobs.forEach((job, name) => {
      console.log(`  - ${name}: ✅ Scheduled`);
    });
  }

  /**
   * Stop all scheduled jobs
   */
  public stopAllJobs(): void {
    console.log('🛑 Stopping all scheduled jobs...');
    this.scheduledJobs.forEach((job, name) => {
      job.stop();
      console.log(`  - Stopped: ${name}`);
    });
    this.scheduledJobs.clear();
    console.log('✅ All jobs stopped');
  }

  /**
   * Manually trigger a cron job
   * @param jobName - Name of the job to trigger
   */
  public async triggerJob(jobName: string): Promise<boolean> {
    try {
      console.log(`🔄 Manually triggering job: ${jobName}`);
      
      switch (jobName) {
        case 'check-expired-memberships':
          await cronJobService.checkExpiredMemberships();
          break;
        case 'send-renewal-reminders':
          await cronJobService.sendRenewalReminders();
          break;
        case 'auto-renew-memberships':
          await cronJobService.autoRenewMemberships();
          break;
        case 'update-daily-analytics':
          await cronJobService.updateDailyAnalytics();
          break;
        case 'run-all-daily-jobs':
          await cronJobService.runDailyCronJobs();
          break;
        default:
          console.error(`❌ Unknown job: ${jobName}`);
          return false;
      }

      console.log(`✅ Successfully triggered job: ${jobName}`);
      return true;
    } catch (error: any) {
      console.error(`❌ Error triggering job ${jobName}:`, error);
      return false;
    }
  }

  /**
   * Get cron job execution history
   * @param jobName - Optional job name filter
   * @param limit - Number of records to return
   */
  public async getJobHistory(jobName?: string, limit: number = 50) {
    try {
      return await cronJobService.getJobHistory(jobName, limit);
    } catch (error: any) {
      console.error('Error getting job history:', error);
      return [];
    }
  }

  /**
   * Get cron job statistics
   * @param days - Number of days to look back
   */
  public async getJobStatistics(days: number = 30) {
    try {
      return await cronJobService.getJobStatistics(days);
    } catch (error: any) {
      console.error('Error getting job statistics:', error);
      return [];
    }
  }

  /**
   * Health check for cron scheduler
   */
  public healthCheck(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    totalJobs: number;
    runningJobs: number;
    stoppedJobs: number;
    jobsStatus: Array<{ name: string; isRunning: boolean; nextRun?: string }>;
  } {
    const jobsStatus = this.getJobsStatus();
    const runningJobs = jobsStatus.filter(job => job.isRunning).length;
    const stoppedJobs = jobsStatus.filter(job => !job.isRunning).length;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (stoppedJobs > 0) {
      status = stoppedJobs === jobsStatus.length ? 'unhealthy' : 'degraded';
    }

    return {
      status,
      totalJobs: jobsStatus.length,
      runningJobs,
      stoppedJobs,
      jobsStatus
    };
  }
}

export const cronSchedulerService = new CronSchedulerService();
