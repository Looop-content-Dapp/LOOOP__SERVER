# LOOOP Authentication API Documentation

This document describes the comprehensive JWT-based authentication system that replaces Better Auth.

## Overview

The authentication system provides:
- User registration and login with JWT tokens
- Email verification
- Password reset functionality  
- Profile management
- Account deletion
- Secure password hashing with bcrypt
- Rate limiting for security

## Base URL
```
http://localhost:5000/api/v1/auth
```

## Authentication

Most endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Response Format

All responses follow this format:
```json
{
  "success": boolean,
  "message": string,
  "data": object | null,
  "error": {
    "message": string
  } | null
}
```

## Endpoints

### Public Endpoints (No Authentication Required)

#### POST `/register`
Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com", 
  "password": "SecurePass123!",
  "username": "johndoe", // optional
  "bio": "Music lover", // optional
  "referralCode": "REF123" // optional
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully. Please check your email for verification.",
  "data": {
    "user": {
      "id": "clx...",
      "email": "john@example.com",
      "name": "John Doe",
      "username": "johndoe",
      "bio": "Music lover",
      "image": null,
      "isVerified": false,
      "emailVerified": false
    },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "tokenType": "Bearer",
    "expiresIn": 2592000
  }
}
```

#### POST `/login`
Authenticate user and get access token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!",
  "rememberMe": true // optional
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "clx...",
      "email": "john@example.com",
      "name": "John Doe",
      "username": "johndoe",
      "bio": "Music lover",
      "image": null,
      "isVerified": false,
      "emailVerified": true,
      "lastLoginAt": "2025-07-01T19:05:48.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "tokenType": "Bearer",
    "expiresIn": 2592000
  }
}
```

#### POST `/logout`
Logout user (client-side token removal).

**Response (200):**
```json
{
  "success": true,
  "message": "Successfully logged out"
}
```

#### POST `/forgot-password`
Request password reset link.

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "If an account with that email exists, we have sent a password reset link"
}
```

#### POST `/reset-password`
Reset password using token from email.

**Request Body:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "newPassword": "NewSecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset successful"
}
```

#### POST `/verify-email`
Verify email address using token from email.

**Request Body:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

#### GET `/status`
Check authentication status (works with or without token).

**Response (200):**
```json
{
  "success": true,
  "message": "Authenticated", // or "Not authenticated"
  "data": {
    "authenticated": true,
    "user": {
      "id": "clx...",
      "email": "john@example.com",
      "name": "John Doe"
    } // or null if not authenticated
  }
}
```

#### GET `/health`
Health check for auth service.

**Response (200):**
```json
{
  "success": true,
  "message": "Auth routes are operational",
  "timestamp": "2025-07-01T19:05:48.000Z",
  "endpoints": {
    "public": [...],
    "protected": [...]
  }
}
```

### Protected Endpoints (Authentication Required)

#### GET `/me`
Get current user profile.

**Response (200):**
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "user": {
      "id": "clx...",
      "name": "John Doe",
      "email": "john@example.com",
      "username": "johndoe",
      "bio": "Music lover",
      "image": null,
      "isVerified": false,
      "emailVerified": true,
      "lastLoginAt": "2025-07-01T19:05:48.000Z",
      "createdAt": "2025-07-01T10:00:00.000Z",
      "updatedAt": "2025-07-01T19:05:48.000Z",
      "artist": {
        "id": "clx...",
        "name": "John Artist",
        "verified": true,
        "monthlyListeners": 1000,
        "followers": 250
      }, // or null
      "wallet": {
        "address": "0x123...",
        "publickey": "0x456..."
      } // or null
    }
  }
}
```

#### PATCH `/profile`
Update user profile.

**Request Body:**
```json
{
  "name": "John Smith", // optional
  "username": "johnsmith", // optional
  "bio": "Updated bio", // optional
  "image": "https://example.com/avatar.jpg" // optional
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": "clx...",
      "name": "John Smith",
      "email": "john@example.com",
      "username": "johnsmith",
      "bio": "Updated bio",
      "image": "https://example.com/avatar.jpg",
      "isVerified": false,
      "emailVerified": true,
      "updatedAt": "2025-07-01T19:05:48.000Z"
    }
  }
}
```

#### POST `/change-password`
Change user password.

**Request Body:**
```json
{
  "currentPassword": "SecurePass123!",
  "newPassword": "NewSecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

#### POST `/resend-verification`
Resend email verification.

**Response (200):**
```json
{
  "success": true,
  "message": "Verification email sent successfully"
}
```

#### GET `/email-verification-status`
Check email verification status.

**Response (200):**
```json
{
  "success": true,
  "message": "Email verification status retrieved",
  "data": {
    "emailVerified": true,
    "email": "john@example.com"
  }
}
```

#### DELETE `/account`
Delete user account permanently.

**Request Body:**
```json
{
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": {
    "message": "Email and password are required"
  }
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": {
    "message": "Invalid authentication"
  }
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": {
    "message": "User not found"
  }
}
```

### 409 Conflict
```json
{
  "success": false,
  "error": {
    "message": "Email or username already exists"
  }
}
```

### 429 Too Many Requests
```json
{
  "success": false,
  "error": {
    "message": "Too many requests, please try again later"
  }
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": {
    "message": "Internal server error"
  }
}
```

## Security Features

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter  
- At least one number
- At least one special character

### Rate Limiting
- Authentication endpoints are rate limited
- 100 requests per 15-minute window per IP
- Additional protection on login attempts

### JWT Tokens
- 30-day expiration by default
- Includes user ID, email, name, username, verification status
- Signed with strong secret key

### Password Security
- Bcrypt hashing with 12 salt rounds
- Secure password reset with time-limited tokens
- Current password verification for sensitive operations

## Future OAuth Implementation

The system is designed to easily add OAuth providers:

```javascript
// Coming soon:
// GET /auth/google
// GET /auth/google/callback  
// GET /auth/github
// GET /auth/github/callback
```

## Migration from Better Auth

This custom JWT system replaces Better Auth with:
- ✅ Simplified architecture
- ✅ Full control over authentication flow
- ✅ Better integration with existing codebase
- ✅ Comprehensive API endpoints
- ✅ Enhanced security features
- ✅ Proper error handling
- ✅ Rate limiting
- ✅ Transaction safety

## Environment Variables

Required environment variables:
```env
JWT_SECRET=your-super-secret-jwt-key-here-min-32-chars-long-and-secure
JWT_EXPIRES_IN=30d
DATABASE_URL=postgresql://username:password@localhost:5432/looop_db
```
