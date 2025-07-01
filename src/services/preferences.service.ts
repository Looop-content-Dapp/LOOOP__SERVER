import { Prisma } from '@prisma/client';
import { logger } from '@/utils/logger';
import { createError } from '@/middleware/errorHandler';
import { prisma } from '@/config/database';

export interface UserPreferences {
  notifications: {
    email: boolean;
    push: boolean;
    newFollowers: boolean;
    newComments: boolean;
    newLikes: boolean;
    trackUpdates: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'private' | 'friends';
    showEmail: boolean;
    showLastSeen: boolean;
    allowMessages: boolean;
  };
  audio: {
    quality: 'low' | 'medium' | 'high' | 'lossless';
    autoplay: boolean;
    crossfade: boolean;
    crossfadeDuration?: number;
  };
  display: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    compactMode?: boolean;
  };
}

export class PreferencesService {
  private static defaultPreferences: UserPreferences = {
    notifications: {
      email: true,
      push: true,
      newFollowers: true,
      newComments: true,
      newLikes: true,
      trackUpdates: true
    },
    privacy: {
      profileVisibility: 'public',
      showEmail: false,
      showLastSeen: true,
      allowMessages: true
    },
    audio: {
      quality: 'high',
      autoplay: true,
      crossfade: false,
      crossfadeDuration: 3
    },
    display: {
      theme: 'auto',
      language: 'en',
      compactMode: false
    }
  };

  /**
   * Get user preferences with defaults fallback
   */
  public static async getUserPreferences(userId: string): Promise<UserPreferences> {
    try {
      const userPreference = await prisma.userPreference.findUnique({
        where: { userId }
      });

      if (!userPreference || !userPreference.settings) {
        logger.info('No user preferences found, returning defaults', { userId });
        return this.defaultPreferences;
      }

      // Merge with defaults to ensure all properties exist
      const preferences = this.mergeWithDefaults(userPreference.settings as unknown as UserPreferences);

      logger.info('User preferences retrieved successfully', { userId });
      return preferences;
    } catch (error) {
      logger.error('Error retrieving user preferences:', error);
      throw createError('Failed to retrieve user preferences', 500);
    }
  }

  /**
   * Update user preferences
   */
  public static async updateUserPreferences(
    userId: string,
    preferences: Partial<UserPreferences>
  ): Promise<UserPreferences> {
    try {
      // First, get existing preferences or defaults
      const existingPreferences = await this.getUserPreferences(userId);

      // Deep merge the updates with existing preferences
      const updatedPreferences = this.deepMerge(existingPreferences, preferences);

      // Validate the merged preferences
      this.validatePreferences(updatedPreferences);

      // Upsert the preferences
      await prisma.userPreference.upsert({
        where: { userId },
        create: {
          userId,
          settings: updatedPreferences as unknown as Prisma.JsonValue
        },
        update: {
          settings: updatedPreferences as unknown as Prisma.JsonValue
        }
      });

      logger.info('User preferences updated successfully', {
        userId,
        updatedFields: Object.keys(preferences)
      });

      return updatedPreferences;
    } catch (error) {
      logger.error('Error updating user preferences:', error);
      if (error.statusCode) {
        throw error;
      }
      throw createError('Failed to update user preferences', 500);
    }
  }

  /**
   * Reset user preferences to defaults
   */
  public static async resetUserPreferences(userId: string): Promise<UserPreferences> {
    try {
      await prisma.userPreference.upsert({
        where: { userId },
        create: {
          userId,
          settings: this.defaultPreferences as unknown as Prisma.JsonValue
        },
        update: {
          settings: this.defaultPreferences as unknown as Prisma.JsonValue
        }
      });

      logger.info('User preferences reset to defaults', { userId });
      return this.defaultPreferences;
    } catch (error) {
      logger.error('Error resetting user preferences:', error);
      throw createError('Failed to reset user preferences', 500);
    }
  }

  /**
   * Delete user preferences
   */
  public static async deleteUserPreferences(userId: string): Promise<void> {
    try {
      await prisma.userPreference.delete({
        where: { userId }
      });

      logger.info('User preferences deleted', { userId });
    } catch (error) {
      if (error.code === 'P2025') {
        // Record not found, which is fine for delete
        logger.info('No user preferences to delete', { userId });
        return;
      }

      logger.error('Error deleting user preferences:', error);
      throw createError('Failed to delete user preferences', 500);
    }
  }

  /**
   * Get default preferences
   */
  public static getDefaultPreferences(): UserPreferences {
    return { ...this.defaultPreferences };
  }

  /**
   * Merge user preferences with defaults to ensure all properties exist
   */
  private static mergeWithDefaults(userPreferences: UserPreferences): UserPreferences {
    return this.deepMerge(this.defaultPreferences, userPreferences);
  }

  /**
   * Deep merge two objects
   */
  private static deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  /**
   * Validate preferences structure
   */
  private static validatePreferences(preferences: UserPreferences): void {
    // Validate notifications
    if (!preferences.notifications || typeof preferences.notifications !== 'object') {
      throw createError('Invalid notifications preferences', 400);
    }

    // Validate privacy
    if (!preferences.privacy || typeof preferences.privacy !== 'object') {
      throw createError('Invalid privacy preferences', 400);
    }

    if (!['public', 'private', 'friends'].includes(preferences.privacy.profileVisibility)) {
      throw createError('Invalid profile visibility setting', 400);
    }

    // Validate audio
    if (!preferences.audio || typeof preferences.audio !== 'object') {
      throw createError('Invalid audio preferences', 400);
    }

    if (!['low', 'medium', 'high', 'lossless'].includes(preferences.audio.quality)) {
      throw createError('Invalid audio quality setting', 400);
    }

    // Validate display
    if (!preferences.display || typeof preferences.display !== 'object') {
      throw createError('Invalid display preferences', 400);
    }

    if (!['light', 'dark', 'auto'].includes(preferences.display.theme)) {
      throw createError('Invalid theme setting', 400);
    }

    // Validate language code (basic check)
    if (!preferences.display.language || typeof preferences.display.language !== 'string' ||
        preferences.display.language.length < 2 || preferences.display.language.length > 5) {
      throw createError('Invalid language setting', 400);
    }
  }
}
