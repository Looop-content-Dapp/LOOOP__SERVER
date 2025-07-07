#!/usr/bin/env ts-node

import { config } from 'dotenv';
import { 
  sendEmail, 
  sendTestEmail, 
  sendWelcomeEmail, 
  sendVerificationEmail,
  verifyEmailConnection,
  EmailTemplate
} from './sendmail';
import { logger } from '@/utils/logger';

// Load environment variables
config();

// CLI interface for testing email functionality
class EmailTester {
  private async testConnection(): Promise<void> {
    console.log('🔍 Testing email service connection...');
    const isConnected = await verifyEmailConnection();
    
    if (isConnected) {
      console.log('✅ Email service connection successful!');
    } else {
      console.log('❌ Email service connection failed!');
      process.exit(1);
    }
  }
  
  private async testBasicEmail(to: string): Promise<void> {
    console.log(`📧 Sending test email to ${to}...`);
    const success = await sendTestEmail(to);
    
    if (success) {
      console.log('✅ Test email sent successfully!');
    } else {
      console.log('❌ Failed to send test email!');
    }
  }
  
  private async testWelcomeEmail(to: string, username: string): Promise<void> {
    console.log(`👋 Sending welcome email to ${to}...`);
    const success = await sendWelcomeEmail(to, username, '123456');
    
    if (success) {
      console.log('✅ Welcome email sent successfully!');
    } else {
      console.log('❌ Failed to send welcome email!');
    }
  }
  
  private async testVerificationEmail(to: string, username: string): Promise<void> {
    console.log(`🔐 Sending verification email to ${to}...`);
    const success = await sendVerificationEmail(to, username, '654321');
    
    if (success) {
      console.log('✅ Verification email sent successfully!');
    } else {
      console.log('❌ Failed to send verification email!');
    }
  }
  
  private async testCustomEmail(to: string): Promise<void> {
    console.log(`🎨 Sending custom HTML email to ${to}...`);
    const success = await sendEmail({
      to,
      subject: 'Custom Email Test - LOOOP Music',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px; margin-bottom: 20px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎵 LOOOP Music</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Custom Email Test</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 25px; border-radius: 10px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">Email Service Test</h2>
            <p style="color: #666; line-height: 1.6;">This is a custom HTML email to test the advanced features of our email service:</p>
            
            <ul style="color: #666; line-height: 1.8;">
              <li>✅ HTML formatting</li>
              <li>✅ Custom styling</li>
              <li>✅ Responsive design</li>
              <li>✅ Professional layout</li>
            </ul>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
              <p style="margin: 0; color: #333;"><strong>Test Details:</strong></p>
              <p style="margin: 5px 0 0 0; color: #666;">Sent at: ${new Date().toLocaleString()}</p>
              <p style="margin: 5px 0 0 0; color: #666;">Environment: ${process.env.NODE_ENV || 'development'}</p>
            </div>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #999; font-size: 14px;">
            <p>This is an automated test email from LOOOP Music</p>
            <p>© 2024 LOOOP Music. All rights reserved.</p>
          </div>
        </div>
      `,
      text: `LOOOP Music - Custom Email Test\n\nThis is a custom email to test the advanced features of our email service.\n\nTest Details:\nSent at: ${new Date().toLocaleString()}\nEnvironment: ${process.env.NODE_ENV || 'development'}\n\nThis is an automated test email from LOOOP Music.`
    });
    
    if (success) {
      console.log('✅ Custom email sent successfully!');
    } else {
      console.log('❌ Failed to send custom email!');
    }
  }
  
  async runTests(): Promise<void> {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      console.log(`
🎵 LOOOP Music Email Service Tester
`);
      console.log('Usage:');
      console.log('  npm run test:email <command> [options]\n');
      console.log('Commands:');
      console.log('  connection                    - Test email service connection');
      console.log('  basic <email>                - Send basic test email');
      console.log('  welcome <email> <username>   - Send welcome email with template');
      console.log('  verify <email> <username>    - Send verification email with template');
      console.log('  custom <email>               - Send custom HTML email');
      console.log('  all <email> <username>       - Run all tests\n');
      console.log('Examples:');
      console.log('  npm run test:email connection');
      console.log('  npm run test:email basic test@example.com');
      console.log('  npm run test:email welcome test@example.com "John Doe"');
      console.log('  npm run test:email all test@example.com "John Doe"\n');
      return;
    }
    
    const command = args[0];
    
    try {
      switch (command) {
        case 'connection':
          await this.testConnection();
          break;
          
        case 'basic':
          if (!args[1]) {
            console.log('❌ Email address is required for basic test');
            return;
          }
          await this.testConnection();
          await this.testBasicEmail(args[1]);
          break;
          
        case 'welcome':
          if (!args[1] || !args[2]) {
            console.log('❌ Email address and username are required for welcome test');
            return;
          }
          await this.testConnection();
          await this.testWelcomeEmail(args[1], args[2]);
          break;
          
        case 'verify':
          if (!args[1] || !args[2]) {
            console.log('❌ Email address and username are required for verification test');
            return;
          }
          await this.testConnection();
          await this.testVerificationEmail(args[1], args[2]);
          break;
          
        case 'custom':
          if (!args[1]) {
            console.log('❌ Email address is required for custom test');
            return;
          }
          await this.testConnection();
          await this.testCustomEmail(args[1]);
          break;
          
        case 'all':
          if (!args[1] || !args[2]) {
            console.log('❌ Email address and username are required for all tests');
            return;
          }
          console.log('🚀 Running all email tests...\n');
          await this.testConnection();
          console.log('');
          await this.testBasicEmail(args[1]);
          console.log('');
          await this.testWelcomeEmail(args[1], args[2]);
          console.log('');
          await this.testVerificationEmail(args[1], args[2]);
          console.log('');
          await this.testCustomEmail(args[1]);
          console.log('\n🎉 All tests completed!');
          break;
          
        default:
          console.log(`❌ Unknown command: ${command}`);
          console.log('Run without arguments to see usage information.');
      }
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      logger.error('Email test error:', error);
      process.exit(1);
    }
  }
}

// Run the tester if this file is executed directly
if (require.main === module) {
  const tester = new EmailTester();
  tester.runTests().catch(console.error);
}

export default EmailTester;