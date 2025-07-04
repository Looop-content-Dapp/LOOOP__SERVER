import { Request, Response } from 'express';
import { cronSchedulerService } from '@/services/cronScheduler.service';

/**
 * Manually trigger cron job
 */
export const triggerCronJob = async (req: Request, res: Response): Promise<void> => {
  const { jobName } = req.body;

  const success = await cronSchedulerService.triggerJob(jobName);

  if (success) {
    res.status(200).json({
      success: true,
      message: `Job ${jobName} triggered successfully`
    });
  } else {
    res.status(400).json({
      success: false,
      message: `Failed to trigger job ${jobName}`
    });
  }
};

/**
 * Get cron jobs status
 */
export const getCronJobsStatus = async (req: Request, res: Response): Promise<void> => {
  const status = cronSchedulerService.healthCheck();
  const history = await cronSchedulerService.getJobHistory(undefined, 10);
  const statistics = await cronSchedulerService.getJobStatistics(7);

  res.status(200).json({
    success: true,
    data: {
      status,
      recentHistory: history,
      weeklyStatistics: statistics
    }
  });
};

/**
 * Get detailed cron job history
 */
export const getCronJobHistory = async (req: Request, res: Response): Promise<void> => {
  const { jobName, limit = '50' } = req.query;

  const history = await cronSchedulerService.getJobHistory(
    jobName as string,
    parseInt(limit as string)
  );

  res.status(200).json({
    success: true,
    data: history
  });
};

/**
 * Get cron job statistics
 */
export const getCronJobStatistics = async (req: Request, res: Response): Promise<void> => {
  const { days = '30' } = req.query;

  const statistics = await cronSchedulerService.getJobStatistics(
    parseInt(days as string)
  );

  res.status(200).json({
    success: true,
    data: statistics
  });
};

/**
 * Start a stopped cron job
 */
export const startCronJob = async (req: Request, res: Response): Promise<void> => {
  const { jobName } = req.body;

  const success = cronSchedulerService.startJob(jobName);

  if (success) {
    res.status(200).json({
      success: true,
      message: `Job ${jobName} started successfully`
    });
  } else {
    res.status(400).json({
      success: false,
      message: `Failed to start job ${jobName}`
    });
  }
};

/**
 * Stop a running cron job
 */
export const stopCronJob = async (req: Request, res: Response): Promise<void> => {
  const { jobName } = req.body;

  const success = cronSchedulerService.stopJob(jobName);

  if (success) {
    res.status(200).json({
      success: true,
      message: `Job ${jobName} stopped successfully`
    });
  } else {
    res.status(400).json({
      success: false,
      message: `Failed to stop job ${jobName}`
    });
  }
};
