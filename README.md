# AI-Powered Client Personas for Student Project Simulations

A comprehensive system that enables instructors to create realistic, AI-enhanced client personas that simulate real-world stakeholders throughout student software development projects. This system provides authentic industry-like experiences with intelligent personas that maintain consistent personalities, remember project history, and engage with student teams through real-time chat and scheduled milestone meetings.

## Features

- 🤖 **AI-Powered Personas**: Generate realistic client personas with consistent personalities and memory
- 💬 **Real-time Chat**: Interactive communication between students and personas
- 📊 **Analytics Dashboard**: Comprehensive monitoring and analytics for instructors
- 🎯 **Milestone Management**: Structured assessment with persona sign-off requirements
- 📁 **Artifact Management**: File upload and organization system
- 🔐 **Role-Based Access**: Secure authentication for students, instructors, and administrators
- 📈 **Department-Wide Scaling**: Support for multiple classes and instructors

## Tech Stack

- **Backend**: Node.js, Express, TypeScript
- **Frontend**: React, TypeScript, Webpack
- **Database**: MongoDB with Mongoose
- **Real-time**: Socket.io for WebSocket communication
- **AI Integration**: OpenAI GPT-4 for persona responses
- **File Storage**: AWS S3 for artifact storage
- **Testing**: Jest, React Testing Library
- **Development**: Docker, ESLint, Prettier

## Prerequisites

- Node.js 18+ and npm 8+
- MongoDB 7.0+
- Docker and Docker Compose (optional)

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ai-powered-client-personas
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

```bash
cp env.example .env
```

Edit `.env` with your configuration:
- MongoDB connection string
- OpenAI API key
- AWS credentials (for file storage)
- JWT secret

### 4. Start Development Environment

#### Option A: Using Docker (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app
```

#### Option B: Local Development

```bash
# Start MongoDB (if not using Docker)
mongod

# Start the application
npm run dev
```

The application will be available at:
- **Client**: http://localhost:3001
- **Server**: http://localhost:3000
- **MongoDB Express**: http://localhost:8081 (admin/admin123)

## Project Structure

```
src/
├── client/                 # React frontend
│   ├── components/         # React components
│   ├── hooks/             # Custom React hooks
│   └── utils/             # Frontend utilities
├── server/                # Node.js backend
│   ├── config/            # Configuration files
│   ├── middleware/        # Express middleware
│   ├── models/            # Database models
│   ├── routes/            # API routes
│   └── services/          # Business logic services
└── setupTests.ts          # Test setup file
```

## Development

### Available Scripts

```bash
# Development
npm run dev              # Start both client and server
npm run dev:client       # Start client only
npm run dev:server       # Start server only

# Building
npm run build            # Build for production
npm run build:client     # Build client only
npm run build:server     # Build server only

# Testing
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run format           # Format code with Prettier
npm run type-check       # TypeScript type checking
```

### Testing

The project uses Jest for testing with the following conventions:

- Unit tests: `*.test.ts` or `*.test.tsx`
- Test files should be co-located with source files
- Use React Testing Library for component tests
- Aim for 70%+ code coverage

### Code Style

- TypeScript with strict mode enabled
- ESLint for code linting
- Prettier for code formatting
- Conventional commit messages

## API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Project Management

- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Persona Management

- `GET /api/personas` - List personas
- `POST /api/personas` - Create persona
- `PUT /api/personas/:id` - Update persona
- `DELETE /api/personas/:id` - Delete persona

### Chat System

- WebSocket connection for real-time messaging
- `GET /api/chat/history` - Get conversation history
- `POST /api/chat/message` - Send message

## Deployment

### Production Build

```bash
npm run build
npm start
```

### Docker Deployment

```bash
docker build -t ai-personas .
docker run -p 3000:3000 ai-personas
```

### Environment Variables

Ensure all required environment variables are set in production:

- Database connection strings
- AI service API keys
- File storage credentials
- Security keys and secrets

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For questions and support, please contact the development team or create an issue in the repository. 