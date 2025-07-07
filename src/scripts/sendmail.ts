import nodemailer from 'nodemailer';
import { readFileSync } from 'fs';
import { join } from 'path';
import handlebars from 'handlebars';
import { logger } from '@/utils/logger';

// Email configuration interface
interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

// Email options interface
interface EmailOptions {
  to: string | string[];
  subject: string;
  template?: string;
  context?: Record<string, any>;
  html?: string;
  text?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    path?: string;
    content?: Buffer | string;
    contentType?: string;
  }>;
}

// Email templates enum
export enum EmailTemplate {
  SIGNUP = 'signup',
  LOGIN = 'login',
  VERIFY = 'verify',
  ARTIST = 'artist',
  CLAIM = 'claim'
}

// Create transporter with configuration
const createTransporter = (): nodemailer.Transporter => {
  const config: EmailConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || ''
    }
  };

  // Validate required environment variables
  if (!config.auth.user || !config.auth.pass) {
    throw new Error('SMTP credentials are required. Please set SMTP_USER and SMTP_PASS environment variables.');
  }

  return nodemailer.createTransport(config);
};

// Load and compile email template
const loadTemplate = (templateName: string, context: Record<string, any> = {}): string => {
  try {
    const templatePath = join(__dirname, '..', 'emails', `${templateName}.hbs`);
    const templateSource = readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(templateSource);
    return template(context);
  } catch (error) {
    logger.error(`Failed to load email template: ${templateName}`, error);
    throw new Error(`Email template '${templateName}' not found or invalid`);
  }
};

// Verify transporter connection
export const verifyEmailConnection = async (): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    logger.info('Email service connection verified successfully');
    return true;
  } catch (error) {
    logger.error('Email service connection failed:', error);
    return false;
  }
};

// Main email sending function
export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    
    // Prepare email content
    let htmlContent = options.html;
    let textContent = options.text;
    
    // If template is specified, load and compile it
    if (options.template) {
      htmlContent = loadTemplate(options.template, options.context);
      // Generate text version from HTML if not provided
      if (!textContent) {
        textContent = htmlContent.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      }
    }
    
    // Validate required fields
    if (!options.to || !options.subject) {
      throw new Error('Recipient email and subject are required');
    }
    
    if (!htmlContent && !textContent) {
      throw new Error('Email content (HTML, text, or template) is required');
    }
    
    // Prepare mail options
    const mailOptions: nodemailer.SendMailOptions = {
      from: options.from || `"LOOOP Music" <${process.env.SMTP_USER}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: htmlContent,
      text: textContent,
      cc: Array.isArray(options.cc) ? options.cc.join(', ') : options.cc,
      bcc: Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc,
      attachments: options.attachments
    };
    
    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    logger.info('Email sent successfully', {
      messageId: info.messageId,
      to: options.to,
      subject: options.subject,
      template: options.template
    });
    
    return true;
  } catch (error) {
    logger.error('Failed to send email:', {
      error: error.message,
      to: options.to,
      subject: options.subject,
      template: options.template
    });
    return false;
  }
};

// Convenience functions for common email types
export const sendWelcomeEmail = async (
  email: string,
  username: string,
  otp?: string
): Promise<boolean> => {
  return sendEmail({
    to: email,
    subject: 'Welcome to LOOOP Music!',
    template: EmailTemplate.SIGNUP,
    context: {
      username,
      otp
    }
  });
};

export const sendVerificationEmail = async (
  email: string,
  username: string,
  otp: string
): Promise<boolean> => {
  return sendEmail({
    to: email,
    subject: 'Verify Your Email - LOOOP Music',
    template: EmailTemplate.VERIFY,
    context: {
      username,
      otp
    }
  });
};

export const sendLoginNotification = async (
  email: string,
  username: string,
  loginTime: Date,
  ipAddress?: string
): Promise<boolean> => {
  return sendEmail({
    to: email,
    subject: 'New Login to Your LOOOP Account',
    template: EmailTemplate.LOGIN,
    context: {
      username,
      loginTime: loginTime.toLocaleString(),
      ipAddress
    }
  });
};

export const sendArtistClaimEmail = async (
  email: string,
  artistName: string,
  claimToken: string
): Promise<boolean> => {
  return sendEmail({
    to: email,
    subject: 'Artist Profile Claim Request - LOOOP Music',
    template: EmailTemplate.CLAIM,
    context: {
      artistName,
      claimToken,
      claimUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/artist/claim/${claimToken}`
    }
  });
};

export const sendArtistWelcomeEmail = async (
  email: string,
  artistName: string
): Promise<boolean> => {
  return sendEmail({
    to: email,
    subject: 'Welcome to LOOOP Music Artists!',
    template: EmailTemplate.ARTIST,
    context: {
      artistName
    }
  });
};

// Bulk email sending function
export const sendBulkEmails = async (
  emails: string[],
  subject: string,
  template: string,
  context: Record<string, any> = {},
  batchSize: number = 10
): Promise<{ success: number; failed: number }> => {
  let success = 0;
  let failed = 0;
  
  // Process emails in batches to avoid overwhelming the SMTP server
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    
    const promises = batch.map(async (email) => {
      try {
        await sendEmail({
          to: email,
          subject,
          template,
          context
        });
        success++;
      } catch (error) {
        logger.error(`Failed to send email to ${email}:`, error);
        failed++;
      }
    });
    
    await Promise.all(promises);
    
    // Add delay between batches to respect rate limits
    if (i + batchSize < emails.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  logger.info(`Bulk email sending completed: ${success} successful, ${failed} failed`);
  return { success, failed };
};

// Email queue for handling high-volume sending (basic implementation)
interface EmailQueueItem {
  id: string;
  options: EmailOptions;
  retries: number;
  maxRetries: number;
  createdAt: Date;
}

class EmailQueue {
  private queue: EmailQueueItem[] = [];
  private processing = false;
  private readonly maxRetries = 3;
  private readonly retryDelay = 5000; // 5 seconds
  
  async add(options: EmailOptions): Promise<string> {
    const id = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.queue.push({
      id,
      options,
      retries: 0,
      maxRetries: this.maxRetries,
      createdAt: new Date()
    });
    
    if (!this.processing) {
      this.process();
    }
    
    return id;
  }
  
  private async process(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const item = this.queue.shift()!;
      
      try {
        await sendEmail(item.options);
        logger.info(`Email queue: Successfully sent email ${item.id}`);
      } catch (error) {
        item.retries++;
        
        if (item.retries < item.maxRetries) {
          // Re-queue for retry
          setTimeout(() => {
            this.queue.push(item);
            if (!this.processing) {
              this.process();
            }
          }, this.retryDelay * item.retries);
          
          logger.warn(`Email queue: Retrying email ${item.id} (attempt ${item.retries}/${item.maxRetries})`);
        } else {
          logger.error(`Email queue: Failed to send email ${item.id} after ${item.maxRetries} attempts`);
        }
      }
      
      // Small delay between emails
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.processing = false;
  }
  
  getQueueLength(): number {
    return this.queue.length;
  }
  
  clearQueue(): void {
    this.queue = [];
  }
}

// Export email queue instance
export const emailQueue = new EmailQueue();

// Test email function for development
export const sendTestEmail = async (to: string): Promise<boolean> => {
  return sendEmail({
    to,
    subject: 'LOOOP Music - Test Email',
    html: `
      <h2>Test Email from LOOOP Music</h2>
      <p>This is a test email to verify the email service is working correctly.</p>
      <p>Sent at: ${new Date().toISOString()}</p>
      <p>Environment: ${process.env.NODE_ENV || 'development'}</p>
    `,
    text: `Test Email from LOOOP Music\n\nThis is a test email to verify the email service is working correctly.\n\nSent at: ${new Date().toISOString()}\nEnvironment: ${process.env.NODE_ENV || 'development'}`
  });
};

// Export default sendEmail function
export default sendEmail;