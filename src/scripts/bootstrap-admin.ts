#!/usr/bin/env ts-node

import dotenv from 'dotenv';
dotenv.config();

import { prisma } from '@/config/database';
import { AuthService } from '@/services/auth.service';
import { logger } from '@/utils/logger';
import { LOOOP_ADMIN_DOMAIN, DEFAULT_ADMIN_PERMISSIONS } from '@/types/admin.types';

interface BootstrapAdminData {
  name: string;
  email: string;
  password: string;
}

/**
 * Bootstrap script to create the first SUPER_ADMIN user
 * This addresses the chicken-and-egg problem where no admin exists to approve the first admin
 */
export class AdminBootstrap {
  
  /**
   * Create the first SUPER_ADMIN user
   */
  static async createFirstSuperAdmin(adminData: BootstrapAdminData): Promise<void> {
    try {
      const { name, email, password } = adminData;

      // Validate email domain
      if (!email.endsWith(LOOOP_ADMIN_DOMAIN)) {
        throw new Error(`Admin email must be from ${LOOOP_ADMIN_DOMAIN} domain`);
      }

      // Check if any SUPER_ADMIN already exists
      const existingSuperAdmin = await prisma.user.findFirst({
        where: {
          role: 'SUPER_ADMIN',
          isAdmin: true
        }
      });

      if (existingSuperAdmin) {
        logger.warn('SUPER_ADMIN already exists. Bootstrap not needed.', {
          existingAdminEmail: existingSuperAdmin.email
        });
        console.log('❌ A SUPER_ADMIN already exists. Bootstrap not needed.');
        return;
      }

      // Check if user with this email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (existingUser) {
        // If user exists but is not a SUPER_ADMIN, upgrade them
        if (!existingUser.isAdmin || existingUser.role !== 'SUPER_ADMIN') {
          const updatedUser = await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              role: 'SUPER_ADMIN',
              adminLevel: 'SUPER_ADMIN',
              permissions: DEFAULT_ADMIN_PERMISSIONS.SUPER_ADMIN,
              isAdmin: true,
              adminApprovedAt: new Date(),
              adminApprovedBy: 'SYSTEM_BOOTSTRAP'
            }
          });

          logger.info('Existing user upgraded to SUPER_ADMIN', {
            userId: updatedUser.id,
            email: updatedUser.email
          });

          console.log('✅ Existing user upgraded to SUPER_ADMIN successfully!');
          console.log(`   Email: ${updatedUser.email}`);
          console.log(`   Name: ${updatedUser.name}`);
          return;
        } else {
          logger.warn('User already exists as SUPER_ADMIN', {
            email: existingUser.email
          });
          console.log('❌ User already exists as SUPER_ADMIN.');
          return;
        }
      }

      // Hash password
      const hashedPassword = await AuthService.hashPassword(password);

      // Create the first SUPER_ADMIN
      const superAdmin = await prisma.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          password: hashedPassword,
          role: 'SUPER_ADMIN',
          adminLevel: 'SUPER_ADMIN',
          permissions: DEFAULT_ADMIN_PERMISSIONS.SUPER_ADMIN,
          isAdmin: true,
          adminApprovedAt: new Date(),
          adminApprovedBy: 'SYSTEM_BOOTSTRAP',
          emailVerified: true
        }
      });

      logger.info('First SUPER_ADMIN created successfully', {
        userId: superAdmin.id,
        email: superAdmin.email,
        name: superAdmin.name
      });

      console.log('🎉 First SUPER_ADMIN created successfully!');
      console.log(`   Email: ${superAdmin.email}`);
      console.log(`   Name: ${superAdmin.name}`);
      console.log(`   Admin Level: SUPER_ADMIN`);
      console.log(`   Permissions: ${DEFAULT_ADMIN_PERMISSIONS.SUPER_ADMIN.join(', ')}`);
      console.log('\n📋 This admin can now:');
      console.log('   • Approve other admin registrations');
      console.log('   • Manage admin permissions');
      console.log('   • Access all admin features');

    } catch (error) {
      logger.error('Error creating first SUPER_ADMIN:', error);
      console.error('❌ Failed to create SUPER_ADMIN:', error.message);
      throw error;
    }
  }

  /**
   * Check if bootstrap is needed
   */
  static async isBootstrapNeeded(): Promise<boolean> {
    try {
      const superAdminCount = await prisma.user.count({
        where: {
          role: 'SUPER_ADMIN',
          isAdmin: true
        }
      });

      return superAdminCount === 0;
    } catch (error) {
      logger.error('Error checking if bootstrap is needed:', error);
      throw error;
    }
  }

  /**
   * Interactive bootstrap process
   */
  static async runInteractiveBootstrap(): Promise<void> {
    console.log('🚀 LOOOP Admin Bootstrap Process');
    console.log('==================================\n');

    const isNeeded = await this.isBootstrapNeeded();
    
    if (!isNeeded) {
      console.log('❌ Bootstrap not needed. SUPER_ADMIN already exists.');
      return;
    }

    console.log('📝 No SUPER_ADMIN found. Creating the first one...\n');

    // Get admin data from environment variables
    const adminData: BootstrapAdminData = {
      name: process.env.BOOTSTRAP_ADMIN_NAME || 'LOOOP Super Admin',
      email: process.env.BOOTSTRAP_ADMIN_EMAIL || `admin${LOOOP_ADMIN_DOMAIN}`,
      password: process.env.BOOTSTRAP_ADMIN_PASSWORD || 'TempPassword123!'
    };

    // Validate required data
    if (!adminData.email.endsWith(LOOOP_ADMIN_DOMAIN)) {
      console.error(`❌ Admin email must be from ${LOOOP_ADMIN_DOMAIN} domain`);
      console.log(`   Set BOOTSTRAP_ADMIN_EMAIL environment variable`);
      return;
    }

    if (!process.env.BOOTSTRAP_ADMIN_PASSWORD) {
      console.warn('⚠️  Using default password. Set BOOTSTRAP_ADMIN_PASSWORD environment variable for security.');
    }

    console.log(`Creating SUPER_ADMIN with:`);
    console.log(`   Name: ${adminData.name}`);
    console.log(`   Email: ${adminData.email}`);
    console.log(`   Password: ${'*'.repeat(adminData.password.length)}\n`);

    await this.createFirstSuperAdmin(adminData);
  }
}

// Run bootstrap if this script is executed directly
if (require.main === module) {
  AdminBootstrap.runInteractiveBootstrap()
    .then(() => {
      console.log('\n✅ Bootstrap process completed.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Bootstrap process failed:', error.message);
      process.exit(1);
    });
}
