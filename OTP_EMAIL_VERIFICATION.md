# OTP-Based Email Verification System

This document describes the OTP (One-Time Password) based email verification system implemented in the Looop Music server.

## Overview

The system has been updated to use 6-digit OTP codes for email verification instead of JWT tokens. This provides better security and user experience.

## Features

- ✅ 6-digit numeric OTP generation
- ✅ 10-minute OTP expiration
- ✅ One-time use (OTP is deleted after successful verification)
- ✅ Automatic OTP sending during user registration
- ✅ Beautiful email template with OTP display
- ✅ Backward compatibility with existing token-based system

## API Endpoints

### 1. Send Verification OTP

**Endpoint:** `POST /api/auth/send-verification-otp`

**Description:** Sends a new OTP to the user's email address.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification OTP sent successfully"
}
```

**Error Responses:**
- `400`: Email is required
- `404`: User not found
- `500`: Failed to send verification email

### 2. Verify Email with OTP

**Endpoint:** `POST /api/auth/verify-email-otp`

**Description:** Verifies the user's email using the provided OTP.

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

**Error Responses:**
- `400`: Email and OTP are required
- `400`: Invalid or expired OTP
- `404`: User not found
- `500`: Internal server error

## Legacy Endpoints (Backward Compatibility)

The following endpoints are still available for backward compatibility:

- `POST /api/auth/verify-email` - Token-based verification
- `POST /api/auth/resend-verification` - Resend verification (now sends OTP)
- `GET /api/auth/email-verification-status` - Check verification status

## Usage Flow

### 1. User Registration
```javascript
// User registers
POST /api/auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "username": "johndoe"
}

// OTP is automatically sent to user's email
// User receives email with 6-digit OTP
```

### 2. Email Verification
```javascript
// User enters OTP from email
POST /api/auth/verify-email-otp
{
  "email": "john@example.com",
  "otp": "123456"
}

// Email is now verified
```

### 3. Resend OTP (if needed)
```javascript
// If user didn't receive OTP or it expired
POST /api/auth/send-verification-otp
{
  "email": "john@example.com"
}

// New OTP is sent to user's email
```

## Frontend Integration Example

### React/JavaScript Example

```javascript
// Send OTP
const sendOTP = async (email) => {
  try {
    const response = await fetch('/api/auth/send-verification-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('OTP sent to your email!');
    } else {
      alert('Failed to send OTP: ' + data.error.message);
    }
  } catch (error) {
    console.error('Error sending OTP:', error);
  }
};

// Verify OTP
const verifyOTP = async (email, otp) => {
  try {
    const response = await fetch('/api/auth/verify-email-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, otp }),
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert('Email verified successfully!');
      // Redirect to dashboard or next step
    } else {
      alert('Invalid OTP: ' + data.error.message);
    }
  } catch (error) {
    console.error('Error verifying OTP:', error);
  }
};
```

## Security Features

1. **Time-based Expiration**: OTPs expire after 10 minutes
2. **One-time Use**: Each OTP can only be used once
3. **Secure Storage**: OTPs are stored with a prefix in the database
4. **Rate Limiting**: Auth routes have rate limiting applied
5. **Input Validation**: Email and OTP format validation

## Email Template

The system uses a beautiful HTML email template (`src/emails/verify.hbs`) that displays:
- Looop Music branding
- Clear OTP display
- Professional styling
- Social media links

## Testing

A test script is available to verify OTP functionality:

```bash
npx ts-node src/test-otp.ts
```

This will test:
- OTP generation
- OTP verification
- OTP expiration
- Invalid OTP handling
- One-time use enforcement

## Database Schema

OTPs are stored in the existing `verification` table with:
- `identifier`: User's email address
- `value`: OTP code with "OTP_" prefix
- `expires`: Expiration timestamp (10 minutes from creation)

## Error Handling

The system includes comprehensive error handling for:
- Invalid email formats
- Expired OTPs
- Already used OTPs
- Non-existent users
- Email sending failures
- Database errors

## Migration Notes

- Existing token-based verification still works
- New registrations automatically use OTP system
- No database schema changes required
- Backward compatible with existing clients

## Configuration

- OTP length: 6 digits
- OTP expiration: 10 minutes
- Email template: `src/emails/verify.hbs`
- Rate limiting: Applied to all auth routes

## Support

For issues or questions about the OTP system, check:
1. Server logs for detailed error information
2. Email delivery status
3. Database verification records
4. Rate limiting status