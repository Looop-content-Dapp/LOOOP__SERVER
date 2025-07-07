# LOOOP Authentication API Documentation for React Native Expo

This document provides implementation details for integrating LOOOP's authentication system in your React Native Expo application.

## Base URL
```
http://localhost:5000/api/v1/auth
```

## Authentication

Most endpoints require a Bearer token in the Authorization header:
```javascript
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};
```

## Response Format

All API responses follow this format:
```typescript
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  error?: {
    message: string;
  };
}
```

## Implementation Guide

### 1. Email Registration

```typescript
const register = async (userData: {
  name: string;
  email: string;
  password: string;
  username?: string;
  bio?: string;
  referralCode?: string;
}) => {
  try {
    const response = await fetch('${BASE_URL}/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });
    
    const data = await response.json();
    if (!data.success) throw new Error(data.error.message);
    
    return data;
  } catch (error) {
    throw error;
  }
};
```

### 2. Email Login

```typescript
const login = async (credentials: {
  email: string;
  password: string;
  rememberMe?: boolean;
}) => {
  try {
    const response = await fetch('${BASE_URL}/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    });
    
    const data = await response.json();
    if (!data.success) throw new Error(data.error.message);
    
    return data;
  } catch (error) {
    throw error;
  }
};
```

### 3. Google OAuth Authentication

```typescript
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

const googleAuth = async () => {
  try {
    // Register your URL scheme in app.json
    // "scheme": "com.looop.app"
    
    // Handle deep linking
    Linking.addEventListener('url', handleGoogleRedirect);
    
    // Open Google auth URL
    const result = await WebBrowser.openAuthSessionAsync(
      '${BASE_URL}/google',
      'com.looop.app:/oauth2redirect/google'
    );
    
    return result;
  } catch (error) {
    throw error;
  }
};

const handleGoogleRedirect = (event: { url: string }) => {
  const { url } = event;
  const token = url.split('token=')[1];
  if (token) {
    // Store token and update auth state
  }
};
```

### 4. Apple OAuth Authentication

```typescript
import * as AppleAuthentication from 'expo-apple-authentication';

const appleAuth = async () => {
  try {
    // Register your URL scheme in app.json
    // "scheme": "com.looop.app"
    
    // Handle deep linking
    Linking.addEventListener('url', handleAppleRedirect);
    
    // Open Apple auth URL
    const result = await WebBrowser.openAuthSessionAsync(
      '${BASE_URL}/apple',
      'com.looop.app:/oauth2redirect/apple'
    );
    
    return result;
  } catch (error) {
    throw error;
  }
};

const handleAppleRedirect = (event: { url: string }) => {
  const { url } = event;
  const token = url.split('token=')[1];
  if (token) {
    // Store token and update auth state
  }
};
```

### 5. Email Verification (OTP)

```typescript
// Request OTP
const sendVerificationOTP = async (email: string) => {
  try {
    const response = await fetch('${BASE_URL}/send-verification-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });
    
    const data = await response.json();
    if (!data.success) throw new Error(data.error.message);
    
    return data;
  } catch (error) {
    throw error;
  }
};

// Verify OTP
const verifyEmailOTP = async (email: string, otp: string) => {
  try {
    const response = await fetch('${BASE_URL}/verify-email-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, otp })
    });
    
    const data = await response.json();
    if (!data.success) throw new Error(data.error.message);
    
    return data;
  } catch (error) {
    throw error;
  }
};
```

### 6. Password Management

```typescript
// Request password reset
const forgotPassword = async (email: string) => {
  try {
    const response = await fetch('${BASE_URL}/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });
    
    const data = await response.json();
    if (!data.success) throw new Error(data.error.message);
    
    return data;
  } catch (error) {
    throw error;
  }
};

// Reset password with token
const resetPassword = async (token: string, newPassword: string) => {
  try {
    const response = await fetch('${BASE_URL}/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token, newPassword })
    });
    
    const data = await response.json();
    if (!data.success) throw new Error(data.error.message);
    
    return data;
  } catch (error) {
    throw error;
  }
};

// Change password (authenticated)
const changePassword = async (currentPassword: string, newPassword: string, token: string) => {
  try {
    const response = await fetch('${BASE_URL}/change-password', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    
    const data = await response.json();
    if (!data.success) throw new Error(data.error.message);
    
    return data;
  } catch (error) {
    throw error;
  }
};
```

### 7. Profile Management

```typescript
// Get user profile
const getProfile = async (token: string) => {
  try {
    const response = await fetch('${BASE_URL}/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    if (!data.success) throw new Error(data.error.message);
    
    return data;
  } catch (error) {
    throw error;
  }
};

// Update profile
const updateProfile = async (token: string, updates: {
  name?: string;
  username?: string;
  bio?: string;
  image?: string;
}) => {
  try {
    const response = await fetch('${BASE_URL}/profile', {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });
    
    const data = await response.json();
    if (!data.success) throw new Error(data.error.message);
    
    return data;
  } catch (error) {
    throw error;
  }
};

// Delete account
const deleteAccount = async (token: string, password: string) => {
  try {
    const response = await fetch('${BASE_URL}/account', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ password })
    });
    
    const data = await response.json();
    if (!data.success) throw new Error(data.error.message);
    
    return data;
  } catch (error) {
    throw error;
  }
};
```

## Setup Requirements

1. Install required dependencies:
```bash
npx expo install expo-web-browser expo-auth-session expo-random expo-apple-authentication @react-native-async-storage/async-storage
```

2. Configure app.json:
```json
{
  "expo": {
    "scheme": "com.looop.app",
    "ios": {
      "bundleIdentifier": "com.looop.app"
    },
    "android": {
      "package": "com.looop.app"
    }
  }
}
```

3. Set up environment variables:
```typescript
// config.ts
export const BASE_URL = 'http://localhost:5000/api/v1/auth';
```

## Security Best Practices

1. Token Storage:
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Store token securely
const storeToken = async (token: string) => {
  try {
    await AsyncStorage.setItem('@auth_token', token);
  } catch (error) {
    console.error('Error storing token:', error);
  }
};

// Retrieve token
const getToken = async () => {
  try {
    return await AsyncStorage.getItem('@auth_token');
  } catch (error) {
    console.error('Error retrieving token:', error);
    return null;
  }
};

// Remove token on logout
const removeToken = async () => {
  try {
    await AsyncStorage.removeItem('@auth_token');
  } catch (error) {
    console.error('Error removing token:', error);
  }
};
```

2. Input Validation:
```typescript
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password: string): boolean => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};
```

## Error Handling

Implement a consistent error handling approach:

```typescript
interface ApiError {
  message: string;
  code?: number;
}

class AuthError extends Error {
  code?: number;
  
  constructor(message: string, code?: number) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}

const handleApiError = (error: any): ApiError => {
  if (error instanceof AuthError) {
    return {
      message: error.message,
      code: error.code
    };
  }
  
  return {
    message: 'An unexpected error occurred',
    code: 500
  };
};
```

## Rate Limiting

The API implements rate limiting:
- 100 requests per 15-minute window per IP
- Additional protection on login attempts

Implement exponential backoff in your client:

```typescript
const backoff = async (retries: number, fn: () => Promise<any>) => {
  try {
    return await fn();
  } catch (error) {
    if (error.code === 429 && retries > 0) {
      const delay = Math.pow(2, 5 - retries) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      return backoff(retries - 1, fn);
    }
    throw error;
  }
};
```

## JWT Token Management

The JWT token expires in 30 days. Implement token refresh logic:

```typescript
const checkTokenExpiration = (token: string): boolean => {
  try {
    const [, payload] = token.split('.');
    const { exp } = JSON.parse(atob(payload));
    return Date.now() >= exp * 1000;
  } catch {
    return true;
  }
};

const refreshTokenIfNeeded = async (token: string) => {
  if (checkTokenExpiration(token)) {
    // Implement token refresh logic
    // For now, require re-login
    await removeToken();
    // Redirect to login
  }
};
```
