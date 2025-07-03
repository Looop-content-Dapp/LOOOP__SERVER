# Environment Setup Guide

## Security Notice

⚠️ **IMPORTANT**: Never commit actual secrets, API keys, or passwords to version control!

This repository uses environment variables to manage sensitive configuration. All secrets should be stored in a `.env` file that is **never committed** to GitHub.

## Quick Setup

### 1. Copy Environment Template
```bash
cp .env.example .env
```

### 2. Configure Your Environment Variables

Edit the `.env` file with your actual values:

#### Required for Local Development
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/looop_db"

# Authentication
JWT_SECRET="your-super-secret-jwt-key-here-min-32-chars-long-and-secure"

# Admin Bootstrap (for first admin user)
BOOTSTRAP_ADMIN_EMAIL="admin@looopmusic.com"
BOOTSTRAP_ADMIN_PASSWORD="your-secure-admin-password"
```

#### Optional Services (configure as needed)
```env
# Google OAuth (for social login)
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Cloudinary (for file uploads)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"

# Email Service
SMTP_HOST="smtp.gmail.com"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
```

### 3. Verify Configuration
```bash
# Check that .env is not tracked by Git
git status

# Start the development server
npm run dev
```

## Docker Compose

The `docker-compose.yml` file references environment variables from your `.env` file:

```yaml
environment:
  - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
  - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
  # ... other variables
```

This approach ensures:
- ✅ No secrets in version control
- ✅ Easy configuration management
- ✅ Same setup works for all developers
- ✅ Production-ready deployment pattern

## Production Deployment

For production environments:

### 1. Use Environment Variables
Set environment variables directly in your hosting platform:
- Heroku: `heroku config:set JWT_SECRET=your-secret`
- Vercel: Add in project settings
- AWS/Docker: Use environment variable injection

### 2. Use Secrets Management
- AWS Secrets Manager
- Azure Key Vault
- Kubernetes Secrets
- Docker Swarm Secrets

### 3. Database Security
```env
# Use connection pooling and SSL in production
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require&pgbouncer=true"
```

## Environment Variables Reference

### Core Application
| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | Yes | Application environment | `development`, `production` |
| `PORT` | Yes | Server port | `5000` |
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://...` |
| `JWT_SECRET` | Yes | JWT signing secret (min 32 chars) | `your-secret-key...` |

### Authentication
| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |
| `APPLE_CLIENT_ID` | No | Apple OAuth client ID |

### External Services
| Variable | Required | Description |
|----------|----------|-------------|
| `CLOUDINARY_CLOUD_NAME` | No | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | No | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | No | Cloudinary API secret |
| `SMTP_HOST` | No | Email server host |
| `SMTP_USER` | No | Email username |
| `SMTP_PASS` | No | Email password |

### Admin System
| Variable | Required | Description |
|----------|----------|-------------|
| `BOOTSTRAP_ADMIN_NAME` | No | First admin user name |
| `BOOTSTRAP_ADMIN_EMAIL` | Yes* | First admin email (@looopmusic.com) |
| `BOOTSTRAP_ADMIN_PASSWORD` | Yes* | First admin password |

*Required for admin bootstrap

## Security Best Practices

### 1. Strong Secrets
```bash
# Generate secure JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate secure passwords
openssl rand -base64 32
```

### 2. Regular Rotation
- Rotate JWT secrets periodically
- Update API keys when they expire
- Change default passwords immediately

### 3. Access Control
- Use principle of least privilege
- Limit API key permissions
- Monitor access logs

### 4. Environment Separation
```env
# Development
DATABASE_URL="postgresql://localhost:5432/looop_dev"

# Staging  
DATABASE_URL="postgresql://staging-host:5432/looop_staging"

# Production
DATABASE_URL="postgresql://prod-host:5432/looop_prod"
```

## Troubleshooting

### Push Protection Error
If you get a "Repository rule violations" error:

1. **Remove secrets from code**:
   ```bash
   # Check what's being committed
   git diff --cached
   
   # Remove sensitive files from staging
   git reset HEAD docker-compose.yml
   ```

2. **Use environment variables**:
   ```yaml
   # ❌ Don't do this
   environment:
     - GOOGLE_CLIENT_SECRET=GOCSPX-actual-secret-here
   
   # ✅ Do this instead
   environment:
     - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
   ```

3. **Clean up git history** (if secrets were committed):
   ```bash
   # Remove sensitive data from Git history
   git filter-branch --force --index-filter \
     'git rm --cached --ignore-unmatch docker-compose.yml' \
     --prune-empty --tag-name-filter cat -- --all
   ```

### Missing Environment Variables
```bash
# Check if .env file exists
ls -la .env

# Copy from template if missing
cp .env.example .env

# Edit with your values
nano .env
```

### Docker Issues
```bash
# Rebuild containers after env changes
docker-compose down
docker-compose up --build

# Check environment variables in container
docker-compose exec app env | grep GOOGLE
```

## Need Help?

1. Check the `.env.example` file for all required variables
2. Verify your `.env` file is not tracked by Git: `git status`
3. Ensure all required variables are set for your use case
4. Check the application logs for missing environment variable errors
