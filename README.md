# LOOOP Server 🎵

A comprehensive music streaming platform backend with NFT integration and community features.

## 🚀 Features

### Core Features (MVP)
- **User Authentication** - JWT-based auth with OAuth support
- **Music Streaming** - Track upload, playback, and management
- **Artist Platform** - Artist profiles and verification system
- **Community System** - Artist communities with NFT-gated access
- **Social Features** - Following, likes, comments, and feed
- **NFT Integration** - Starknet blockchain integration for community access

### Future Features
- Advanced analytics and recommendations
- Referral and gift systems
- Editorial playlists
- Advanced search functionality
- Real-time notifications

## 🛠 Tech Stack

- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT + OAuth (Google, Apple)
- **File Storage**: Cloudinary
- **Blockchain**: Starknet for NFT functionality
- **Real-time**: Socket.io
- **Testing**: Mocha + Chai
- **Logging**: Winston
- **Containerization**: Docker & Docker Compose

## 📁 Project Structure

```
LOOOP_SERVER/
├── src/
│   ├── config/          # Database and app configuration
│   ├── controllers/     # Request handlers
│   │   ├── auth/        # Authentication controllers
│   │   ├── music/       # Music-related controllers
│   │   ├── user/        # User management controllers
│   │   ├── artist/      # Artist platform controllers
│   │   ├── community/   # Community controllers
│   │   ├── nft/         # NFT controllers
│   │   ├── analytics/   # Analytics controllers
│   │   └── social/      # Social features controllers
│   ├── middleware/      # Express middleware
│   ├── models/          # Data models and types
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic services
│   ├── utils/           # Utility functions
│   ├── types/           # TypeScript type definitions
│   └── index.ts         # Application entry point
├── prisma/              # Database schema and migrations
├── tests/               # Test files
├── docs/                # Documentation
├── uploads/             # File upload directory
├── logs/                # Application logs
└── docker-compose.yml   # Development environment
```

## 🚦 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- PostgreSQL database
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd LOOOP_SERVER
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Database Setup**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Run database migrations
   npm run db:migrate
   
   # (Optional) Open Prisma Studio
   npm run db:studio
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:5000`

### Using Docker (Recommended for Development)

1. **Start with Docker Compose**
   ```bash
   docker-compose up -d
   ```

This will start:
- PostgreSQL database on port 5432
- Application server on port 5000
- WebSocket server on port 5001

## 📋 Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build production bundle
- `npm start` - Start production server
- `npm test` - Run test suite
- `npm run test:coverage` - Run tests with coverage
- `npm run lint` - Lint code
- `npm run lint:fix` - Fix linting issues
- `npm run format` - Format code with Prettier
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio

## 🏗 Development Roadmap

### Phase 1: Core Foundation (Current MVP)
- [x] Project scaffolding and basic setup
- [ ] User authentication system
- [ ] Basic music upload and streaming
- [ ] Artist profile management
- [ ] Database schema implementation

### Phase 2: Community Features
- [ ] Community creation and management
- [ ] NFT integration for community access
- [ ] Social features (follow, like, comment)
- [ ] Real-time features with WebSocket

### Phase 3: Advanced Features
- [ ] Analytics dashboard
- [ ] Recommendation engine
- [ ] Advanced search functionality
- [ ] Notification system
- [ ] Admin dashboard

### Phase 4: Optimization & Scaling
- [ ] Performance optimization
- [ ] Caching layer (Redis)
- [ ] CDN integration
- [ ] Advanced monitoring

## 🔧 Environment Variables

Key environment variables to configure:

```env
# Server
NODE_ENV=development
PORT=5000

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/looop_db"

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# File Upload
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Blockchain
STARKNET_PROVIDER_URL=your-starknet-provider
STARKNET_PRIVATE_KEY=your-private-key
```

## 🧪 Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- --grep "Auth"
```

## 📚 API Documentation

API documentation will be available at `/docs` once implemented.

### Available Endpoints

- `GET /health` - Health check
- `GET /api/v1/auth/health` - Auth module health
- `GET /api/v1/users/health` - User module health
- `GET /api/v1/music/health` - Music module health
- `GET /api/v1/artists/health` - Artist module health
- `GET /api/v1/communities/health` - Community module health
- `GET /api/v1/nfts/health` - NFT module health
- `GET /api/v1/social/health` - Social module health

## 🚀 Deployment

### Production Build

```bash
npm run build
npm start
```

### Docker Production

```bash
docker build -t looop-server .
docker run -p 5000:5000 looop-server
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, email support@looop.music or create an issue in the repository.

---

**Built with ❤️ by the LOOOP Team**
