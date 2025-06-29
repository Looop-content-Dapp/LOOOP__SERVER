import { logger } from './logger';

/**
 * Validates email format using a comprehensive regex pattern
 */
export const validateEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // RFC 5322 compliant email regex (simplified version)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  return emailRegex.test(email.toLowerCase());
};

/**
 * Validates password strength
 * Requirements:
 * - At least 8 characters long
 * - Contains at least one uppercase letter
 * - Contains at least one lowercase letter
 * - Contains at least one number
 * - Contains at least one special character
 */
export const validatePassword = (password: string): boolean => {
  if (!password || typeof password !== 'string') {
    return false;
  }

  // Check minimum length
  if (password.length < 8) {
    return false;
  }

  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    return false;
  }

  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    return false;
  }

  // Check for number
  if (!/\d/.test(password)) {
    return false;
  }

  // Check for special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return false;
  }

  return true;
};

/**
 * Validates username format
 * Requirements:
 * - 3-30 characters long
 * - Contains only letters, numbers, underscores, and hyphens
 * - Starts with a letter or number
 * - Cannot end with underscore or hyphen
 */
export const validateUsername = (username: string): boolean => {
  if (!username || typeof username !== 'string') {
    return false;
  }

  // Check length
  if (username.length < 3 || username.length > 30) {
    return false;
  }

  // Check format
  const usernameRegex = /^[a-zA-Z0-9][a-zA-Z0-9_-]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/;
  
  return usernameRegex.test(username);
};

/**
 * Validates phone number format (basic international format)
 */
export const validatePhoneNumber = (phone: string): boolean => {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  // Remove all non-digit characters except + at the beginning
  const cleanPhone = phone.replace(/[^\d+]/g, '');
  
  // Check if it's a valid international format
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  
  return phoneRegex.test(cleanPhone);
};

/**
 * Validates URL format
 */
export const validateUrl = (url: string): boolean => {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Sanitizes user input by removing potential XSS characters
 */
export const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

/**
 * Validates file type for uploads
 */
export const validateFileType = (filename: string, allowedTypes: string[]): boolean => {
  if (!filename || !allowedTypes || allowedTypes.length === 0) {
    return false;
  }

  const fileExtension = filename.toLowerCase().split('.').pop();
  
  if (!fileExtension) {
    return false;
  }

  return allowedTypes.some(type => 
    type.toLowerCase().includes(fileExtension) || 
    fileExtension === type.toLowerCase()
  );
};

/**
 * Validates file size (in bytes)
 */
export const validateFileSize = (fileSize: number, maxSizeInMB: number): boolean => {
  if (typeof fileSize !== 'number' || typeof maxSizeInMB !== 'number') {
    return false;
  }

  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return fileSize <= maxSizeInBytes;
};

/**
 * Validates age (must be at least 13 years old)
 */
export const validateAge = (birthDate: Date): boolean => {
  if (!birthDate || !(birthDate instanceof Date)) {
    return false;
  }

  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    return age - 1 >= 13;
  }

  return age >= 13;
};

/**
 * Validates a referral code format
 */
export const validateReferralCode = (code: string): boolean => {
  if (!code || typeof code !== 'string') {
    return false;
  }

  // Referral codes should be 6-12 characters, alphanumeric
  const codeRegex = /^[A-Z0-9]{6,12}$/;
  
  return codeRegex.test(code.toUpperCase());
};

/**
 * Password strength checker with detailed feedback
 */
export interface PasswordStrength {
  score: number; // 0-4 (weak to very strong)
  feedback: string[];
  isValid: boolean;
}

export const checkPasswordStrength = (password: string): PasswordStrength => {
  const feedback: string[] = [];
  let score = 0;

  if (!password) {
    return {
      score: 0,
      feedback: ['Password is required'],
      isValid: false
    };
  }

  // Length check
  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('Password must be at least 8 characters long');
  }

  // Character variety checks
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add lowercase letters');
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add uppercase letters');
  }

  if (/\d/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add numbers');
  }

  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add special characters');
  }

  // Additional strength checks
  if (password.length >= 12) {
    score += 1;
  }

  if (password.length >= 16) {
    score += 1;
  }

  // Common password patterns (weak)
  const commonPatterns = [
    /123456/,
    /password/i,
    /qwerty/i,
    /abc123/i,
    /admin/i
  ];

  if (commonPatterns.some(pattern => pattern.test(password))) {
    score = Math.max(0, score - 2);
    feedback.push('Avoid common password patterns');
  }

  // Normalize score to 0-4 range
  score = Math.min(4, score);

  const isValid = score >= 3 && validatePassword(password);

  if (feedback.length === 0) {
    if (score === 4) {
      feedback.push('Very strong password!');
    } else if (score === 3) {
      feedback.push('Strong password');
    }
  }

  return {
    score,
    feedback,
    isValid
  };
};
