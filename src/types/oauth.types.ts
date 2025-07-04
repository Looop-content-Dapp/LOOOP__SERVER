export interface OAuthProfile {
  provider: 'GOOGLE' | 'APPLE';
  email: string;
  name?: string;
  picture?: string;
  providerId?: string;
}

export interface GoogleTokenPayload {
  iss: string;
  azp: string;
  aud: string;
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  locale?: string;
  iat: number;
  exp: number;
}

export interface AppleTokenPayload {
  iss: string;
  sub: string; // The unique identifier for the user
  aud: string;
  exp: number;
  iat: number;
  email?: string;
  email_verified?: boolean;
  is_private_email?: boolean;
  real_user_status?: number;
  nonce_supported?: boolean;
}