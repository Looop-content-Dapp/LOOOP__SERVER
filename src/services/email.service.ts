import { sendEmail, EmailTemplate } from '@/scripts/sendmail';
import { logger } from '@/utils/logger';
import { ArtistClaimFull } from '@/types/artist-claim.types';

/**
 * Email service for artist claim related notifications
 */
export class EmailService {
  /**
   * Send confirmation email to user after artist claim submission
   */
  public static async sendClaimConfirmationEmail(claim: any): Promise<boolean> {
    try {
      const estimatedReviewTime = claim.submissionType === 'distributor_verified' 
        ? '1-2 business days' 
        : '1-3 business days';

      const trackingNumber = `AC-${claim.submittedAt.getTime()}-${claim.id.slice(-9).toUpperCase()}`;

      const emailSent = await sendEmail({
        to: claim.email,
        subject: 'Artist Claim Submitted Successfully - LOOOP Music',
        template: EmailTemplate.CLAIM,
        context: {
          artist_name: claim.fullName,
          message: `Your artist claim for "${claim.artistName}" has been submitted successfully! We've received your request and our team will review it within ${estimatedReviewTime}.`,
          claim_details: {
            artistName: claim.artistName,
            role: claim.role,
            submissionType: claim.submissionType,
            estimatedReviewTime,
            trackingNumber,
            submittedAt: new Date(claim.submittedAt).toLocaleDateString(),
            status: claim.status
          },
          tracking_info: {
            number: trackingNumber,
            status: 'Under Review',
            nextSteps: claim.submissionType === 'distributor_verified' 
              ? 'Our team will verify your distributor information and review your claim.'
              : 'Our team will manually review your submission and may contact you for additional information.',
            estimated_completion: estimatedReviewTime
          },
          support_email: 'support@looop.com',
          claim_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/claims/${claim.id}`
        }
      });

      if (emailSent) {
        logger.info('Claim confirmation email sent successfully', {
          claimId: claim.id,
          email: claim.email,
          artistName: claim.artistName
        });
      }

      return emailSent;
    } catch (error) {
      logger.error('Failed to send claim confirmation email:', {
        error: error.message,
        claimId: claim.id,
        email: claim.email
      });
      return false;
    }
  }

  /**
   * Notify admin team about new artist claim submission
   */
  public static async notifyAdminTeam(claim: any): Promise<boolean> {
    try {
      const adminEmails = process.env.ADMIN_EMAILS?.split(',') || ['admin@looop.com'];
      const trackingNumber = `AC-${claim.submittedAt.getTime()}-${claim.id.slice(-9).toUpperCase()}`;

      // Prepare admin notification content
      const adminContext = {
        claim_id: claim.id,
        tracking_number: trackingNumber,
        artist_name: claim.artistName,
        claimant_name: claim.fullName,
        claimant_email: claim.email,
        role: claim.role,
        submission_type: claim.submissionType,
        submitted_at: new Date(claim.submittedAt).toLocaleDateString(),
        priority: claim.submissionType === 'distributor_verified' ? 'High' : 'Normal',
        social_links: claim.socialLinks,
        website_url: claim.websiteUrl,
        distributor_info: claim.distributorInfo,
        admin_url: `${process.env.ADMIN_URL || 'http://localhost:3001'}/claims/${claim.id}`,
        review_url: `${process.env.ADMIN_URL || 'http://localhost:3001'}/admin/claims/${claim.id}`
      };

      // Send notification to each admin
      const emailPromises = adminEmails.map(adminEmail => 
        sendEmail({
          to: adminEmail.trim(),
          subject: `🎵 New Artist Claim: ${claim.artistName} [${trackingNumber}]`,
          html: this.generateAdminNotificationHTML(adminContext),
          context: adminContext
        })
      );

      const results = await Promise.allSettled(emailPromises);
      const successCount = results.filter(result => result.status === 'fulfilled').length;

      logger.info('Admin team notification sent', {
        claimId: claim.id,
        adminEmailsSent: successCount,
        totalAdmins: adminEmails.length,
        trackingNumber
      });

      return successCount > 0;
    } catch (error) {
      logger.error('Failed to notify admin team:', {
        error: error.message,
        claimId: claim.id
      });
      return false;
    }
  }

  /**
   * Send claim status update email to user
   */
  public static async sendClaimStatusUpdate(
    claim: ArtistClaimFull, 
    newStatus: string, 
    adminNotes?: string
  ): Promise<boolean> {
    try {
      let subject = '';
      let message = '';
      
      switch (newStatus) {
        case 'approved':
          subject = '🎉 Your Artist Claim has been Approved!';
          message = `Congratulations! Your artist claim for "${claim.artistName}" has been approved. You can now manage your artist profile and start uploading music.`;
          break;
        case 'rejected':
          subject = '❌ Artist Claim Update Required';
          message = `We've reviewed your artist claim for "${claim.artistName}" and need additional information. Please review the feedback below and resubmit your claim.`;
          break;
        case 'under_review':
          subject = '🔍 Your Artist Claim is Under Review';
          message = `Your artist claim for "${claim.artistName}" is now being reviewed by our team. We'll update you soon!`;
          break;
        case 'info_required':
          subject = '📋 Additional Information Required';
          message = `We need some additional information to process your artist claim for "${claim.artistName}". Please see the details below.`;
          break;
        default:
          subject = '📢 Artist Claim Status Update';
          message = `Your artist claim for "${claim.artistName}" status has been updated.`;
      }

      const emailSent = await sendEmail({
        to: claim.email,
        subject: `${subject} - LOOOP Music`,
        template: EmailTemplate.CLAIM,
        context: {
          artist_name: claim.fullName,
          message: message,
          claim_details: {
            artistName: claim.artistName,
            status: newStatus,
            trackingNumber: claim.trackingNumber,
            updatedAt: new Date().toLocaleDateString(),
            adminNotes: adminNotes
          },
          action_required: newStatus === 'info_required' || newStatus === 'rejected',
          support_email: 'support@looop.com',
          claim_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/claims/${claim.id}`
        }
      });

      if (emailSent) {
        logger.info('Claim status update email sent successfully', {
          claimId: claim.id,
          email: claim.email,
          newStatus,
          artistName: claim.artistName
        });
      }

      return emailSent;
    } catch (error) {
      logger.error('Failed to send claim status update email:', {
        error: error.message,
        claimId: claim.id,
        email: claim.email,
        newStatus
      });
      return false;
    }
  }

  /**
   * Generate HTML content for admin notification emails
   */
  private static generateAdminNotificationHTML(context: any): string {
    return `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>New Artist Claim Notification</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: white; }
            .header { background-color: #FF6B2C; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; }
            .claim-details { background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .priority-high { border-left: 4px solid #dc3545; }
            .priority-normal { border-left: 4px solid #28a745; }
            .action-buttons { text-align: center; margin: 20px 0; }
            .btn { display: inline-block; padding: 12px 24px; margin: 0 10px; text-decoration: none; border-radius: 5px; }
            .btn-primary { background-color: #007bff; color: white; }
            .btn-success { background-color: #28a745; color: white; }
            .social-links { margin: 10px 0; }
            .social-links a { margin-right: 10px; color: #007bff; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎵 New Artist Claim Submitted</h1>
              <p>Tracking: ${context.tracking_number}</p>
            </div>
            
            <div class="content">
              <div class="claim-details ${context.priority === 'High' ? 'priority-high' : 'priority-normal'}">
                <h3>Claim Details</h3>
                <p><strong>Artist Name:</strong> ${context.artist_name}</p>
                <p><strong>Claimant:</strong> ${context.claimant_name} (${context.claimant_email})</p>
                <p><strong>Role:</strong> ${context.role}</p>
                <p><strong>Submission Type:</strong> ${context.submission_type}</p>
                <p><strong>Priority:</strong> <span style="color: ${context.priority === 'High' ? '#dc3545' : '#28a745'}">${context.priority}</span></p>
                <p><strong>Submitted:</strong> ${context.submitted_at}</p>
              </div>

              ${context.website_url ? `<p><strong>Website:</strong> <a href="${context.website_url}" target="_blank">${context.website_url}</a></p>` : ''}
              
              ${context.social_links ? `
                <div class="social-links">
                  <strong>Social Links:</strong><br>
                  ${context.social_links.instagram ? `<a href="${context.social_links.instagram}" target="_blank">Instagram</a>` : ''}
                  ${context.social_links.twitter ? `<a href="${context.social_links.twitter}" target="_blank">Twitter</a>` : ''}
                  ${context.social_links.tiktok ? `<a href="${context.social_links.tiktok}" target="_blank">TikTok</a>` : ''}
                  ${context.social_links.spotify ? `<a href="${context.social_links.spotify}" target="_blank">Spotify</a>` : ''}
                </div>
              ` : ''}

              ${context.distributor_info && context.distributor_info.provider !== 'none' ? `
                <div class="claim-details">
                  <h4>Distributor Information</h4>
                  <p><strong>Provider:</strong> ${context.distributor_info.provider}</p>
                  <p><strong>Account Email:</strong> ${context.distributor_info.accountEmail}</p>
                  <p><strong>Verified:</strong> ${context.distributor_info.isVerified ? 'Yes' : 'No'}</p>
                </div>
              ` : ''}

              <div class="action-buttons">
                <a href="${context.review_url}" class="btn btn-primary">Review Claim</a>
                <a href="${context.admin_url}" class="btn btn-success">Admin Dashboard</a>
              </div>

              <p style="color: #666; font-size: 14px;">
                This is an automated notification. Please review the claim in the admin dashboard.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Send bulk notification emails to multiple recipients
   */
  public static async sendBulkNotification(
    emails: string[],
    subject: string,
    htmlContent: string,
    context: any = {}
  ): Promise<{ success: number; failed: number }> {
    try {
      const promises = emails.map(email => 
        sendEmail({
          to: email,
          subject,
          html: htmlContent,
          context
        })
      );

      const results = await Promise.allSettled(promises);
      const success = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.filter(result => result.status === 'rejected').length;

      logger.info('Bulk notification sent', { success, failed, total: emails.length });
      return { success, failed };
    } catch (error) {
      logger.error('Failed to send bulk notification:', error);
      return { success: 0, failed: emails.length };
    }
  }
}

export default EmailService;
