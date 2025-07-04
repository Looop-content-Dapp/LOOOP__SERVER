import { User } from '@prisma/client';

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  username?: string;
  isVerified: boolean;
  emailVerified: boolean;
  iat?: number;
  exp?: number;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  username?: string;
  referralCode?: string;
  bio?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: Partial<User>;
    token: string;
    tokenType: 'Bearer';
    expiresIn: number;
  };
  error?: {
    message: string;
  };
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  newPassword: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface EmailVerificationRequest {
  token: string;
}
