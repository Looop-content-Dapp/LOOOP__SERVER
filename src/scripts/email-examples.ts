/**
 * Email Service Usage Examples
 * 
 * This file demonstrates various ways to use the email service
 * in your LOOOP Music application.
 */

import { 
  sendEmail, 
  sendWelcomeEmail, 
  sendVerificationEmail,
  sendLoginNotification,
  sendArtistClaimEmail,
  sendArtistWelcomeEmail,
  sendBulkEmails,
  emailQueue,
  verifyEmailConnection,
  EmailTemplate
} from './sendmail';
import { logger } from '@/utils/logger';

/**
 * Example 1: User Registration Flow
 */
export const handleUserRegistration = async (
  email: string, 
  username: string, 
  otp: string
): Promise<void> => {
  try {
    // Send welcome email with OTP for verification
    const success = await sendWelcomeEmail(email, username, otp);
    
    if (success) {
      logger.info(`Welcome email sent to ${email}`);
    } else {
      logger.error(`Failed to send welcome email to ${email}`);
      // Handle fallback logic here
    }
  } catch (error) {
    logger.error('Error in user registration email flow:', error);
    throw error;
  }
};

/**
 * Example 2: Email Verification Resend
 */
export const resendVerificationEmail = async (
  email: string,
  username: string,
  newOtp: string
): Promise<boolean> => {
  try {
    return await sendVerificationEmail(email, username, newOtp);
  } catch (error) {
    logger.error('Error resending verification email:', error);
    return false;
  }
};

/**
 * Example 3: Security Notification
 */
export const notifyUserLogin = async (
  email: string,
  username: string,
  ipAddress: string,
  userAgent: string
): Promise<void> => {
  try {
    const loginTime = new Date();
    
    // Send login notification
    await sendLoginNotification(email, username, loginTime, ipAddress);
    
    // Also send a custom security email with more details
    await sendEmail({
      to: email,
      subject: 'Security Alert - New Login Detected',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #d32f2f;">🔐 Security Alert</h2>
          <p>Hello ${username},</p>
          <p>We detected a new login to your LOOOP Music account:</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <strong>Login Details:</strong><br>
            📅 Time: ${loginTime.toLocaleString()}<br>
            🌐 IP Address: ${ipAddress}<br>
            💻 Device: ${userAgent}<br>
          </div>
          <p>If this wasn't you, please secure your account immediately by changing your password.</p>
          <p>Stay safe,<br>The LOOOP Team</p>
        </div>
      `
    });
    
    logger.info(`Security notification sent to ${email}`);
  } catch (error) {
    logger.error('Error sending login notification:', error);
  }
};

/**
 * Example 4: Artist Onboarding Flow
 */
export const handleArtistClaim = async (
  email: string,
  artistName: string,
  claimToken: string
): Promise<boolean> => {
  try {
    // Send artist claim email
    const claimSent = await sendArtistClaimEmail(email, artistName, claimToken);
    
    if (claimSent) {
      // Queue a follow-up email for 24 hours later
      setTimeout(async () => {
        await emailQueue.add({
          to: email,
          subject: 'Reminder: Complete Your Artist Profile Claim',
          template: 'claim',
          context: {
            artistName,
            claimToken,
            isReminder: true,
            claimUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/artist/claim/${claimToken}`
          }
        });
      }, 24 * 60 * 60 * 1000); // 24 hours
    }
    
    return claimSent;
  } catch (error) {
    logger.error('Error in artist claim flow:', error);
    return false;
  }
};

/**
 * Example 5: Newsletter/Announcement System
 */
export const sendNewsletterAnnouncement = async (
  userEmails: string[],
  subject: string,
  content: {
    title: string;
    message: string;
    features?: string[];
    ctaText?: string;
    ctaUrl?: string;
  }
): Promise<{ success: number; failed: number }> => {
  try {
    // Create custom HTML template for newsletter
    const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px; margin-bottom: 20px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🎵 ${content.title}</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 25px; border-radius: 10px; margin-bottom: 20px;">
          <p style="font-size: 16px; line-height: 1.6; color: #333;">${content.message}</p>
          
          ${content.features ? `
            <h3 style="color: #333; margin-top: 25px;">✨ What's New:</h3>
            <ul style="color: #666; line-height: 1.8;">
              ${content.features.map(feature => `<li>${feature}</li>`).join('')}
            </ul>
          ` : ''}
          
          ${content.ctaText && content.ctaUrl ? `
            <div style="text-align: center; margin-top: 30px;">
              <a href="${content.ctaUrl}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                ${content.ctaText}
              </a>
            </div>
          ` : ''}
        </div>
        
        <div style="text-align: center; padding: 20px; color: #999; font-size: 14px;">
          <p>You're receiving this because you're a valued member of LOOOP Music.</p>
          <p>© 2024 LOOOP Music. All rights reserved.</p>
        </div>
      </div>
    `;
    
    // Send to all users in batches
    const result = await sendBulkEmails(
      userEmails,
      subject,
      '', // No template file, using custom HTML
      {},
      15 // Batch size of 15 to respect rate limits
    );
    
    // Override with custom HTML for each email
    const promises = userEmails.map(email => 
      sendEmail({
        to: email,
        subject,
        html: htmlTemplate
      })
    );
    
    const results = await Promise.allSettled(promises);
    const success = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    logger.info(`Newsletter sent: ${success} successful, ${failed} failed`);
    return { success, failed };
    
  } catch (error) {
    logger.error('Error sending newsletter:', error);
    return { success: 0, failed: userEmails.length };
  }
};

/**
 * Example 6: System Health Check Email
 */
export const sendSystemHealthReport = async (
  adminEmails: string[],
  healthData: {
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    activeUsers: number;
    errorCount: number;
    timestamp: Date;
  }
): Promise<void> => {
  try {
    const healthHtml = `
      <div style="font-family: monospace; max-width: 800px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">🔧 LOOOP System Health Report</h2>
        <p><strong>Generated:</strong> ${healthData.timestamp.toISOString()}</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>📊 System Metrics</h3>
          <ul style="list-style: none; padding: 0;">
            <li>⏱️ <strong>Uptime:</strong> ${Math.floor(healthData.uptime / 3600)} hours</li>
            <li>💾 <strong>Memory Usage:</strong> ${Math.round(healthData.memoryUsage.heapUsed / 1024 / 1024)} MB</li>
            <li>👥 <strong>Active Users:</strong> ${healthData.activeUsers}</li>
            <li>❌ <strong>Error Count (24h):</strong> ${healthData.errorCount}</li>
          </ul>
        </div>
        
        <div style="background: ${healthData.errorCount > 10 ? '#ffebee' : '#e8f5e8'}; padding: 15px; border-radius: 8px;">
          <strong>Status:</strong> ${healthData.errorCount > 10 ? '⚠️ Attention Required' : '✅ System Healthy'}
        </div>
      </div>
    `;
    
    await sendBulkEmails(
      adminEmails,
      `LOOOP Health Report - ${healthData.timestamp.toDateString()}`,
      '', // No template
      {},
      5 // Small batch for admin emails
    );
    
    // Send individual emails with custom HTML
    for (const email of adminEmails) {
      await sendEmail({
        to: email,
        subject: `LOOOP Health Report - ${healthData.timestamp.toDateString()}`,
        html: healthHtml
      });
    }
    
  } catch (error) {
    logger.error('Error sending health report:', error);
  }
};

/**
 * Example 7: Email Service Initialization and Health Check
 */
export const initializeEmailService = async (): Promise<boolean> => {
  try {
    logger.info('Initializing email service...');
    
    // Test connection
    const isConnected = await verifyEmailConnection();
    
    if (!isConnected) {
      logger.error('Email service connection failed during initialization');
      return false;
    }
    
    // Send initialization notification to admins (if configured)
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      await sendEmail({
        to: adminEmail,
        subject: 'LOOOP Email Service Initialized',
        html: `
          <h2>✅ Email Service Started</h2>
          <p>The LOOOP email service has been successfully initialized.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
        `
      });
    }
    
    logger.info('Email service initialized successfully');
    return true;
    
  } catch (error) {
    logger.error('Failed to initialize email service:', error);
    return false;
  }
};

/**
 * Example 8: Error Notification System
 */
export const sendErrorNotification = async (
  error: Error,
  context: {
    userId?: string;
    endpoint?: string;
    timestamp: Date;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }
): Promise<void> => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) return;
    
    const severityColors = {
      low: '#4caf50',
      medium: '#ff9800',
      high: '#f44336',
      critical: '#d32f2f'
    };
    
    await sendEmail({
      to: adminEmail,
      subject: `🚨 LOOOP Error Alert - ${context.severity.toUpperCase()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: ${severityColors[context.severity]}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">🚨 Error Alert</h2>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Severity: ${context.severity.toUpperCase()}</p>
          </div>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 0 0 8px 8px;">
            <h3>Error Details:</h3>
            <p><strong>Message:</strong> ${error.message}</p>
            <p><strong>Timestamp:</strong> ${context.timestamp.toISOString()}</p>
            ${context.endpoint ? `<p><strong>Endpoint:</strong> ${context.endpoint}</p>` : ''}
            ${context.userId ? `<p><strong>User ID:</strong> ${context.userId}</p>` : ''}
            
            <h4>Stack Trace:</h4>
            <pre style="background: white; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 12px;">${error.stack}</pre>
          </div>
        </div>
      `
    });
    
  } catch (emailError) {
    logger.error('Failed to send error notification email:', emailError);
  }
};

// Export all examples for easy importing
export default {
  handleUserRegistration,
  resendVerificationEmail,
  notifyUserLogin,
  handleArtistClaim,
  sendNewsletterAnnouncement,
  sendSystemHealthReport,
  initializeEmailService,
  sendErrorNotification
};