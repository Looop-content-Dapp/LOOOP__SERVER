import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '@/config/database';
import { JWTPayload } from '@/types/auth.types';
import { createError } from '@/middleware/errorHandler';
import { logger } from '@/utils/logger';
import dotenv from 'dotenv';
dotenv.config();

export class AuthService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'UztsXXhLANMrecp5KsKPD1g2vfE98Bzb';
  private static readonly JWT_EXPIRES_IN = 30 * 24 * 60 * 60;
  private static readonly SALT_ROUNDS = 12;

  /**
   * Generate JWT token
   */
  public static generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    if (!this.JWT_SECRET || this.JWT_SECRET === 'UztsXXhLANMrecp5KsKPD1g2vfE98Bzb') {
      logger.warn('Using default JWT secret - this is not secure for production!');
    }

    return jwt.sign(
      payload as Record<string, unknown>,
      this.JWT_SECRET,
      {
        expiresIn: this.JWT_EXPIRES_IN
      }
    );
  }

  /**
   * Verify JWT token
   */
  public static verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.JWT_SECRET) as JWTPayload;
    } catch (error) {
      throw createError('Invalid or expired token', 401);
    }
  }

  /**
   * Hash password
   */
  public static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Compare password with hash
   */
  public static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate password reset token
   */
  public static async generatePasswordResetToken(email: string): Promise<string> {
    const token = jwt.sign({ email }, this.JWT_SECRET, { expiresIn: '1h' });

    await prisma.verification.create({
      data: {
        identifier: email,
        value: token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
      }
    });

    return token;
  }

  /**
   * Verify password reset token
   */
  public static async verifyPasswordResetToken(token: string): Promise<string> {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as { email: string };

      const verification = await prisma.verification.findFirst({
        where: {
          identifier: decoded.email,
          value: token,
          expiresAt: { gt: new Date() }
        }
      });

      if (!verification) {
        throw createError('Invalid or expired reset token', 401);
      }

      return decoded.email;
    } catch (error) {
      logger.error('Password reset token verification failed:', error);
      throw createError('Invalid or expired reset token', 401);
    }
  }

  /**
   * Generate email verification token
   */
  public static async generateEmailVerificationToken(email: string): Promise<string> {
    const token = jwt.sign({ email }, this.JWT_SECRET, { expiresIn: '24h' });

    await prisma.verification.create({
      data: {
        identifier: email,
        value: token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    });

    return token;
  }

  /**
   * Verify email verification token
   */
  public static async verifyEmailVerificationToken(token: string): Promise<string> {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as { email: string };

      const verification = await prisma.verification.findFirst({
        where: {
          identifier: decoded.email,
          value: token,
          expiresAt: { gt: new Date() }
        }
      });

      if (!verification) {
        throw createError('Invalid or expired verification token', 401);
      }

      return decoded.email;
    } catch (error) {
      logger.error('Email verification token verification failed:', error);
      throw createError('Invalid or expired verification token', 401);
    }
  }
}
