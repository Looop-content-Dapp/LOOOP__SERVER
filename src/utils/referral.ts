import { logger } from './logger';

/**
 * Generates a unique referral code based on user name and ID
 */
export const generateReferralCode = (name: string, userId: string): string => {
  try {
    // Take first 3 letters of name (uppercase)
    const namePrefix = name
      .replace(/[^a-zA-Z]/g, '') // Remove non-alphabetic characters
      .toUpperCase()
      .substring(0, 3)
      .padEnd(3, 'X'); // Pad with 'X' if name is too short

    // Take last 4 characters of userId
    const userSuffix = userId.slice(-4).toUpperCase();
    
    // Add random characters for uniqueness
    const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
    
    // Combine to create referral code (format: AAA1234XXXX)
    const referralCode = `${namePrefix}${userSuffix}${randomChars}`;
    
    return referralCode;
  } catch (error) {
    logger.error('Error generating referral code:', error);
    
    // Fallback: generate completely random code
    return Math.random().toString(36).substring(2, 12).toUpperCase();
  }
};

/**
 * Validates if a referral code format is correct
 */
export const isValidReferralCodeFormat = (code: string): boolean => {
  if (!code || typeof code !== 'string') {
    return false;
  }

  // Referral codes should be 6-12 characters, alphanumeric
  const codeRegex = /^[A-Z0-9]{6,12}$/;
  
  return codeRegex.test(code.toUpperCase());
};

/**
 * Generates a short, human-readable referral code
 */
export const generateShortReferralCode = (name: string): string => {
  try {
    // Take first 2 letters of name
    const namePrefix = name
      .replace(/[^a-zA-Z]/g, '')
      .toUpperCase()
      .substring(0, 2)
      .padEnd(2, 'X');

    // Add 4 random numbers
    const randomNumbers = Math.floor(1000 + Math.random() * 9000);
    
    return `${namePrefix}${randomNumbers}`;
  } catch (error) {
    logger.error('Error generating short referral code:', error);
    
    // Fallback: generate random 6-character code
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }
};

/**
 * Calculates referral rewards based on referral type and user status
 */
export interface ReferralReward {
  type: 'signup_bonus' | 'premium_bonus' | 'artist_bonus' | 'subscription_bonus';
  amount: number;
  currency: string;
  description: string;
}

export const calculateReferralReward = (
  referralType: 'signup' | 'premium_upgrade' | 'artist_signup' | 'subscription',
  referrerTier: 'basic' | 'premium' | 'artist' = 'basic'
): ReferralReward => {
  const baseRewards = {
    signup: { amount: 5, description: 'New user signup' },
    premium_upgrade: { amount: 15, description: 'Premium upgrade referral' },
    artist_signup: { amount: 25, description: 'Artist account referral' },
    subscription: { amount: 20, description: 'Subscription referral' }
  };

  const tierMultipliers = {
    basic: 1,
    premium: 1.5,
    artist: 2
  };

  const baseReward = baseRewards[referralType] || baseRewards.signup;
  const multiplier = tierMultipliers[referrerTier] || 1;
  
  return {
    type: `${referralType}_bonus` as ReferralReward['type'],
    amount: Math.round(baseReward.amount * multiplier),
    currency: 'USD',
    description: `${baseReward.description} (${referrerTier} tier)`
  };
};

/**
 * Formats referral code for display (adds hyphens for readability)
 */
export const formatReferralCodeDisplay = (code: string): string => {
  if (!code || code.length < 6) {
    return code;
  }

  // Add hyphen every 4 characters for better readability
  return code.replace(/(.{4})/g, '$1-').replace(/-$/, '');
};

/**
 * Cleans referral code input (removes hyphens and spaces, converts to uppercase)
 */
export const cleanReferralCode = (code: string): string => {
  if (!code || typeof code !== 'string') {
    return '';
  }

  return code
    .replace(/[-\s]/g, '') // Remove hyphens and spaces
    .toUpperCase()
    .trim();
};

/**
 * Generates multiple referral code suggestions for a user
 */
export const generateReferralCodeSuggestions = (name: string, userId: string): string[] => {
  const suggestions: string[] = [];
  
  try {
    // Suggestion 1: Name + random numbers
    const nameOnly = name.replace(/[^a-zA-Z]/g, '').toUpperCase().substring(0, 4);
    const randomNum1 = Math.floor(100 + Math.random() * 900);
    suggestions.push(`${nameOnly}${randomNum1}`);
    
    // Suggestion 2: Initials + user ID suffix + random
    const initials = name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
    const userSuffix = userId.slice(-2).toUpperCase();
    const randomNum2 = Math.floor(10 + Math.random() * 90);
    suggestions.push(`${initials}${userSuffix}${randomNum2}`);
    
    // Suggestion 3: Original generator
    suggestions.push(generateReferralCode(name, userId));
    
    // Suggestion 4: Short version
    suggestions.push(generateShortReferralCode(name));
    
    // Remove duplicates and filter valid codes
    return [...new Set(suggestions)].filter(isValidReferralCodeFormat);
    
  } catch (error) {
    logger.error('Error generating referral code suggestions:', error);
    
    // Fallback: return at least one valid code
    return [generateReferralCode(name, userId)];
  }
};

/**
 * Tracks referral analytics
 */
export interface ReferralAnalytics {
  totalReferrals: number;
  successfulReferrals: number;
  pendingReferrals: number;
  totalRewards: number;
  conversionRate: number;
}

export const calculateReferralAnalytics = (referrals: any[]): ReferralAnalytics => {
  const total = referrals.length;
  const successful = referrals.filter(r => r.status === 'completed').length;
  const pending = referrals.filter(r => r.status === 'pending').length;
  
  const totalRewards = referrals
    .filter(r => r.reward && r.status === 'completed')
    .reduce((sum, r) => sum + (r.reward?.amount || 0), 0);
  
  const conversionRate = total > 0 ? (successful / total) * 100 : 0;
  
  return {
    totalReferrals: total,
    successfulReferrals: successful,
    pendingReferrals: pending,
    totalRewards,
    conversionRate: Math.round(conversionRate * 100) / 100
  };
};
