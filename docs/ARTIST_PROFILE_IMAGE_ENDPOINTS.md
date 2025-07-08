# Artist Profile Image Upload Endpoints

## Overview
These endpoints allow artists to upload and manage their profile images. Artists must have an approved claim (verified artist profile) to use these endpoints.

## Authentication
All endpoints require authentication via JWT token in the `Authorization` header:
```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### 1. Upload Artist Profile Image

**POST** `/api/v1/artists/profile/image`

Upload a new profile image for the authenticated artist.

#### Prerequisites
- User must be authenticated
- User must have an approved artist claim (verified artist profile)

#### Request Format
- **Content-Type**: `multipart/form-data`
- **Field Name**: `profileImage`
- **Supported Formats**: JPEG, PNG, WebP
- **File Size Limit**: 10MB
- **Image Processing**: Automatically resized to 800x800px with face-cropping

#### Example Request
```bash
curl -X POST http://localhost:3001/api/v1/artists/profile/image \
  -H "Authorization: Bearer your-jwt-token" \
  -F "profileImage=@/path/to/your-image.jpg"
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Profile image uploaded successfully",
  "data": {
    "artist": {
      "id": "artist-id",
      "name": "Artist Name",
      "profileImage": "https://res.cloudinary.com/your-cloud/image/upload/v123456789/artist-profiles/abc123.jpg",
      "email": "artist@example.com",
      "verified": true,
      "followers": 1500,
      "monthlyListeners": 2500,
      // ... other artist fields
    },
    "upload": {
      "url": "https://res.cloudinary.com/your-cloud/image/upload/v123456789/artist-profiles/abc123.jpg",
      "publicId": "artist-profiles/abc123"
    }
  }
}
```

#### Error Responses

**401 Unauthorized**
```json
{
  "success": false,
  "error": {
    "message": "User not authenticated"
  }
}
```

**404 Not Found**
```json
{
  "success": false,
  "error": {
    "message": "Artist profile not found. You must have an approved artist claim to upload a profile image."
  }
}
```

**400 Bad Request**
```json
{
  "success": false,
  "error": {
    "message": "No file uploaded"
  }
}
```

**400 Bad Request - Invalid File Type**
```json
{
  "success": false,
  "error": {
    "message": "Invalid file type. Only JPEG, PNG, and WebP images are allowed."
  }
}
```

### 2. Remove Artist Profile Image

**DELETE** `/api/v1/artists/profile/image`

Remove the current profile image for the authenticated artist.

#### Prerequisites
- User must be authenticated
- User must have an approved artist claim
- Artist must have an existing profile image

#### Example Request
```bash
curl -X DELETE http://localhost:3001/api/v1/artists/profile/image \
  -H "Authorization: Bearer your-jwt-token"
```

#### Success Response (200 OK)
```json
{
  "success": true,
  "message": "Profile image removed successfully",
  "data": {
    "artist": {
      "id": "artist-id",
      "name": "Artist Name",
      "profileImage": null,
      "email": "artist@example.com",
      "verified": true,
      "followers": 1500,
      "monthlyListeners": 2500,
      // ... other artist fields
    }
  }
}
```

#### Error Responses

**401 Unauthorized**
```json
{
  "success": false,
  "error": {
    "message": "User not authenticated"
  }
}
```

**404 Not Found**
```json
{
  "success": false,
  "error": {
    "message": "Artist profile not found"
  }
}
```

**400 Bad Request**
```json
{
  "success": false,
  "error": {
    "message": "No profile image to remove"
  }
}
```

## Image Processing Details

### Automatic Processing
- **Size**: Images are automatically resized to 800x800 pixels
- **Crop**: Face-detection cropping is applied when possible
- **Quality**: Optimized for web delivery
- **Storage**: Stored in Cloudinary under the `artist-profiles/` folder

### File Validation
- **Formats**: JPEG (.jpg, .jpeg), PNG (.png), WebP (.webp)
- **Size Limit**: 10MB maximum file size
- **MIME Types**: `image/jpeg`, `image/png`, `image/webp`

## Storage & CDN

### Cloudinary Integration
- **Folder Structure**: `artist-profiles/`
- **Naming**: Auto-generated unique identifiers
- **Transformations**: Applied automatically (800x800, face-crop)
- **CDN**: Global CDN delivery for fast loading

### URL Structure
```
https://res.cloudinary.com/your-cloud/image/upload/v{timestamp}/artist-profiles/{public_id}.{format}
```

## Security Features

1. **Authentication Required**: All endpoints require valid JWT tokens
2. **Artist Verification**: Only users with approved artist claims can upload
3. **File Type Validation**: Strict MIME type checking
4. **Size Limits**: 10MB maximum to prevent abuse
5. **Automatic Cleanup**: Old images are deleted when new ones are uploaded

## Rate Limiting

Standard rate limiting applies:
- **Window**: 15 minutes
- **Requests**: 100 requests per window per user

## Error Handling

### Cloudinary Errors
- If Cloudinary upload fails, the endpoint returns a 500 error
- Old images are cleaned up on successful uploads
- Failed cleanup operations are logged but don't fail the request

### Database Errors
- Artist profile updates are atomic
- Failed database updates don't leave orphaned files

## Integration Examples

### Frontend Integration (JavaScript)
```javascript
// Upload profile image
const uploadProfileImage = async (file, token) => {
  const formData = new FormData();
  formData.append('profileImage', file);
  
  const response = await fetch('/api/v1/artists/profile/image', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  return response.json();
};

// Remove profile image
const removeProfileImage = async (token) => {
  const response = await fetch('/api/v1/artists/profile/image', {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return response.json();
};
```

### React Component Example
```jsx
import React, { useState } from 'react';

const ArtistProfileImageUpload = ({ token, onImageUpdate }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('profileImage', file);

      const response = await fetch('/api/v1/artists/profile/image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        onImageUpdate(result.data.artist);
      } else {
        setError(result.error.message);
      }
    } catch (err) {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    setUploading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/artists/profile/image', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (result.success) {
        onImageUpdate(result.data.artist);
      } else {
        setError(result.error.message);
      }
    } catch (err) {
      setError('Remove failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileUpload}
        disabled={uploading}
      />
      <button onClick={handleRemoveImage} disabled={uploading}>
        Remove Image
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {uploading && <p>Processing...</p>}
    </div>
  );
};
```

## Testing

### Manual Testing with cURL

1. **Upload an image**:
```bash
curl -X POST http://localhost:3001/api/v1/artists/profile/image \
  -H "Authorization: Bearer <your-token>" \
  -F "profileImage=@test-image.jpg" \
  -v
```

2. **Remove the image**:
```bash
curl -X DELETE http://localhost:3001/api/v1/artists/profile/image \
  -H "Authorization: Bearer <your-token>" \
  -v
```

### Expected Flow
1. User must have an approved artist claim first
2. Upload a profile image (replaces any existing image)
3. Image is processed and stored in Cloudinary
4. Artist profile is updated with new image URL
5. Old image (if any) is deleted from Cloudinary
6. Response includes updated artist data and upload details

## Notes

- **One Image Only**: Artists can only have one profile image at a time
- **Automatic Replacement**: Uploading a new image automatically replaces the existing one
- **Cleanup**: Old images are automatically deleted to save storage
- **Face Detection**: Cloudinary's face detection is used for optimal cropping
- **Global CDN**: Images are served via Cloudinary's global CDN for fast loading worldwide

## Related Endpoints

- `GET /api/v1/artists/my-profile` - Get current artist profile (includes profileImage URL)
- `PUT /api/v1/artists/my-profile` - Update other artist profile fields
- `POST /api/v1/artists/claim/submit` - Submit artist claim to become verified
