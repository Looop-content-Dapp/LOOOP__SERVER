# Mobile OAuth Integration Guide

This guide explains how to integrate your existing Google and Apple authentication with the LOOOP backend.

## Overview

The backend now provides two new endpoints specifically designed for mobile OAuth token verification:

- `POST /api/auth/mobile/google` - For Google OAuth tokens
- `POST /api/auth/mobile/apple` - For Apple OAuth tokens

## Backend Endpoints

### Google Mobile OAuth
**Endpoint:** `POST /api/auth/mobile/google`

**Request Body:**
```json
{
  "channel": "google",
  "email": "user@example.com",
  "token": "google_id_token_here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Google authentication successful",
  "data": {
    "token": "jwt_token_here",
    "isNewUser": false,
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "name": "User Name",
      "username": "username",
      "emailVerified": true,
      "image": "profile_image_url"
    }
  }
}
```

### Apple Mobile OAuth
**Endpoint:** `POST /api/auth/mobile/apple`

**Request Body:**
```json
{
  "channel": "apple",
  "email": "user@example.com",
  "token": "apple_identity_token_here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Apple authentication successful",
  "data": {
    "token": "jwt_token_here",
    "isNewUser": true,
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "name": "User Name",
      "username": "username",
      "emailVerified": true,
      "image": null
    }
  }
}
```

## Client-Side Integration

### 1. Update Your authenticateUser Function

Replace your existing `authenticateUser` function with this updated version:

```typescript
interface AuthenticateUserParams {
  channel: 'google' | 'apple';
  email: string;
  token: string;
}

export const authenticateUser = async (params: AuthenticateUserParams) => {
  try {
    const { channel, email, token } = params;
    
    const endpoint = channel === 'google' 
      ? '/api/auth/mobile/google' 
      : '/api/auth/mobile/apple';
    
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel,
        email,
        token
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Authentication failed');
    }
    
    if (data.success && data.data?.token) {
      // Store the JWT token
      await AsyncStorage.setItem('authToken', data.data.token);
      await AsyncStorage.setItem('userData', JSON.stringify(data.data.user));
      
      return data.data;
    } else {
      throw new Error('Invalid response from server');
    }
    
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
};
```

### 2. Your Existing OAuth Hooks Work As-Is

Your existing `useGoogleAuth` and `useAppleAuth` hooks don't need any changes! They already:

1. ✅ Get the OAuth tokens from Google/Apple
2. ✅ Extract the email from the tokens
3. ✅ Call `authenticateUser` with the correct parameters
4. ✅ Handle loading states and errors

### 3. Using the JWT Token

After successful authentication, use the returned JWT token for API calls:

```typescript
const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
  const token = await AsyncStorage.getItem('authToken');
  
  if (!token) {
    throw new Error('No authentication token found');
  }
  
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
};
```

## Response Fields

### isNewUser Field
The `isNewUser` boolean field indicates whether this is the user's first time authenticating:
- `true` - User account was just created (first-time login)
- `false` - User already existed in the system (returning user)

This field is useful for:
- Showing welcome/onboarding flows for new users
- Tracking user acquisition metrics
- Implementing different UX flows for new vs returning users

### Client-Side Usage Example
```typescript
const handleAuthResponse = (data: AuthResponse) => {
  if (data.isNewUser) {
    // Show onboarding flow for new users
    navigation.navigate('Onboarding');
  } else {
    // Navigate directly to main app for returning users
    navigation.navigate('Home');
  }
  
  // Store auth data regardless
  await AsyncStorage.setItem('authToken', data.token);
  await AsyncStorage.setItem('userData', JSON.stringify(data.user));
};
```

## How It Works

1. **Client Side:** Your app gets OAuth tokens from Google/Apple
2. **Token Verification:** Backend verifies the tokens with Google/Apple servers
3. **User Management:** Backend finds existing user or creates new one
4. **JWT Generation:** Backend generates a JWT token for your app
5. **Response:** Client receives JWT token, user data, and isNewUser flag
6. **Subsequent Requests:** Client uses JWT token for authenticated API calls

## Security Features

- ✅ **Token Verification:** All OAuth tokens are verified with Google/Apple servers
- ✅ **Email Validation:** Email from token must match provided email
- ✅ **Automatic User Creation:** New users are created automatically
- ✅ **JWT Security:** Uses secure JWT tokens for session management
- ✅ **Error Handling:** Comprehensive error handling and logging

## Environment Variables Required

Make sure these environment variables are set in your backend:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Apple OAuth
APPLE_CLIENT_ID=your_apple_client_id
APPLE_CLIENT_SECRET=your_apple_client_secret

# JWT
JWT_SECRET=your_jwt_secret
```

## Testing

You can test the endpoints using curl:

```bash
# Test Google OAuth
curl -X POST http://localhost:3000/api/auth/mobile/google \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "google",
    "email": "test@example.com",
    "token": "your_google_id_token"
  }'

# Test Apple OAuth
curl -X POST http://localhost:3000/api/auth/mobile/apple \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "apple",
    "email": "test@example.com",
    "token": "your_apple_identity_token"
  }'
```

## Migration Steps

1. ✅ **Backend Updated:** New endpoints are already added
2. 🔄 **Update Client:** Replace your `authenticateUser` function
3. ✅ **Test Integration:** Your existing OAuth hooks should work
4. ✅ **Deploy:** Deploy the updated backend

That's it! Your existing Google and Apple authentication will now work seamlessly with the backend user management system.