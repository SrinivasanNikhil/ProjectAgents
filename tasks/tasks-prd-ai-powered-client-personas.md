# Task List: AI-Powered Client Personas for Student Project Simulations

## Relevant Files

### Backend Infrastructure

- `src/server/index.ts` - Main server entry point with Express app setup, middleware configuration, authentication routes, and WebSocket server integration
- `src/server/index.test.ts` - Unit tests for server setup
- `src/server/config/database.ts` - Database connection and configuration
- `src/server/config/database.test.ts` - Unit tests for database configuration
- `src/server/config/websocket.ts` - WebSocket server configuration with authentication, rate limiting, and real-time communication setup
- `src/server/config/websocket.test.ts` - Unit tests for WebSocket configuration
- `src/server/config/fileStorage.ts` - File storage configuration for S3 and local storage
- `src/server/config/fileStorage.test.ts` - Unit tests for file storage configuration
- `src/server/config/ai.ts` - AI service configuration and setup with OpenAI, Anthropic, and local AI support
- `src/server/config/ai.test.ts` - Unit tests for AI configuration
- `src/server/middleware/auth.ts` - Authentication middleware with JWT token verification, password validation, and user authentication
- `src/server/middleware/auth.test.ts` - Unit tests for authentication middleware
- `src/server/middleware/roleCheck.ts` - Role-based access control middleware
- `src/server/middleware/roleCheck.test.ts` - Unit tests for role middleware
- `src/server/middleware/fileUpload.ts` - File upload middleware with validation and error handling
- `src/server/middleware/fileUpload.test.ts` - Unit tests for file upload middleware
- `src/server/middleware/errorHandler.ts` - Comprehensive error handling middleware with custom error classes
- `src/server/middleware/errorHandler.test.ts` - Unit tests for error handling middleware

### Database Models

- `src/server/models/User.ts` - User model with role-based access
- `src/server/models/User.test.ts` - Unit tests for User model
- `src/server/models/Project.ts` - Project model and relationships
- `src/server/models/Project.test.ts` - Unit tests for Project model
- `src/server/models/Persona.ts` - Persona model with personality traits
- `src/server/models/Persona.test.ts` - Unit tests for Persona model
- `src/server/models/PersonaTemplate.ts` - Persona template model for reusable templates
- `src/server/models/PersonaTemplate.test.ts` - Unit tests for PersonaTemplate model
- `src/server/models/PersonaMood.ts` - Persona mood tracking model
- `src/server/models/PersonaMood.test.ts` - Unit tests for PersonaMood model
- `src/server/models/Conversation.ts` - Conversation and message models
- `src/server/models/Conversation.test.ts` - Unit tests for Conversation model
- `src/server/models/Milestone.ts` - Milestone and assessment models
- `src/server/models/Milestone.test.ts` - Unit tests for Milestone model
- `src/server/models/Meeting.ts` - Meeting model for scheduled milestone meetings with participants, agenda, and meeting management
- `src/server/models/Meeting.test.ts` - Unit tests for Meeting model
- `src/server/models/Artifact.ts` - File upload and artifact models
- `src/server/models/Artifact.test.ts` - Unit tests for Artifact model

### API Routes

- `src/server/routes/auth.ts` - Authentication routes (register, login, logout, profile management, preferences, password change)
- `src/server/routes/auth.test.ts` - Unit tests for auth routes
- `src/server/routes/projects.ts` - Project management routes
- `src/server/routes/projects.test.ts` - Unit tests for project routes
- `src/server/routes/personas.ts` - Persona management routes with CRUD, templates, mood management, AI generation, and instructor dashboard endpoints
- `src/server/routes/personas.test.ts` - Unit tests for persona routes
- `src/server/routes/chat.ts` - Real-time chat routes
- `src/server/routes/chat.test.ts` - Unit tests for chat routes
- `src/server/routes/analytics.ts` - Analytics and monitoring routes with conversation analytics, persona analytics, team performance, interaction patterns, department analytics, export functionality, and batch processing endpoints
- `src/server/routes/analytics.test.ts` - Unit tests for analytics routes with comprehensive test coverage
- `src/server/routes/milestones.ts` - Milestone and assessment routes
- `src/server/routes/milestones.test.ts` - Unit tests for milestone routes
- `src/server/routes/artifacts.ts` - File upload and artifact routes with comprehensive CRUD operations
- `src/server/routes/artifacts.test.ts` - Unit tests for artifact routes
- `src/server/routes/meetings.ts` - Meeting management routes with CRUD operations, participant management, and meeting actions
- `src/server/routes/meetings.test.ts` - Unit tests for meeting routes
- `src/server/routes/monitoring.ts` - System monitoring and health check routes
- `src/server/routes/monitoring.test.ts` - Unit tests for monitoring routes
- `src/server/routes/admin.ts` - System administration routes
- `src/server/routes/admin.test.ts` - Unit tests for admin routes

### Services

- `src/server/services/aiService.ts` - AI integration service for persona responses
- `src/server/services/aiService.test.ts` - Unit tests for AI service
- `src/server/services/personaService.ts` - Persona generation and management logic with AI integration, templates, mood tracking, and instructor dashboard functionality
- `src/server/services/personaService.test.ts` - Unit tests for persona service
- `src/server/services/chatService.ts` - Real-time chat and messaging logic with WebSocket integration, message persistence, and conversation management
- `src/server/services/chatService.test.ts` - Unit tests for chat service
- `src/server/services/analyticsService.ts` - Analytics and reporting logic with comprehensive data collection, processing, conversation analytics, persona performance metrics, enhanced team performance tracking with conflict resolution detection and automated insights generation, interaction patterns analysis, department-wide analytics, and conversation log export functionality
- `src/server/services/analyticsService.test.ts` - Unit tests for analytics service with comprehensive test coverage
- `src/server/services/milestoneService.ts` - Milestone and assessment logic
- `src/server/services/milestoneService.test.ts` - Unit tests for milestone service
- `src/server/services/fileService.ts` - File upload and storage logic with S3 and local storage support
- `src/server/services/fileService.test.ts` - Unit tests for file service
- `src/server/services/meetingService.ts` - Meeting management service with scheduling, participant management, and meeting operations
- `src/server/services/meetingService.test.ts` - Unit tests for meeting service
- `src/server/services/monitoringService.ts` - System monitoring and health check service
- `src/server/services/monitoringService.test.ts` - Unit tests for monitoring service

### Frontend Components

- `src/client/components/Layout/Header.tsx` - Main navigation header
- `src/client/components/Layout/Header.test.tsx` - Unit tests for header
- `src/client/components/Layout/Sidebar.tsx` - Sidebar navigation
- `src/client/components/Layout/Sidebar.test.tsx` - Unit tests for sidebar
- `src/client/components/Auth/LoginForm.tsx` - User login form
- `src/client/components/Auth/LoginForm.test.tsx` - Unit tests for login form
- `src/client/components/Auth/RegisterForm.tsx` - User registration form
- `src/client/components/Auth/RegisterForm.test.tsx` - Unit tests for register form
- `src/client/components/Projects/ProjectList.tsx` - Project listing component
- `src/client/components/Projects/ProjectList.test.tsx` - Unit tests for project list
- `src/client/components/Projects/ProjectForm.tsx` - Project creation/editing form
- `src/client/components/Projects/ProjectForm.test.tsx` - Unit tests for project form
- `src/client/components/Personas/PersonaList.tsx` - Persona management component
- `src/client/components/Personas/PersonaList.test.tsx` - Unit tests for persona list
- `src/client/components/Personas/PersonaForm.tsx` - Persona creation/editing form with project-based suggestions, AI integration, and comprehensive validation
- `src/client/components/Personas/PersonaForm.test.tsx` - Unit tests for persona form with comprehensive test coverage
- `src/client/components/Personas/PersonaCustomization.tsx` - Advanced persona customization interface with mood settings, response style controls, and scenario management
- `src/client/components/Personas/PersonaCustomization.test.tsx` - Unit tests for persona customization interface with comprehensive test coverage
- `src/client/components/Personas/TemplateLibrary.tsx` - Comprehensive template library with search, filtering, and management capabilities
- `src/client/components/Personas/TemplateLibrary.test.tsx` - Unit tests for template library with comprehensive test coverage
- `src/client/components/Personas/TemplateForm.tsx` - Template creation and editing form with validation and AI prompt generation
- `src/client/components/Personas/TemplateForm.test.tsx` - Unit tests for template form with comprehensive test coverage
- `src/client/components/Personas/PersonaManagementDashboard.tsx` - Comprehensive persona management dashboard for instructors with filtering, sorting, management capabilities, and edit functionality
- `src/client/components/Personas/PersonaManagementDashboard.test.tsx` - Unit tests for persona management dashboard with comprehensive test coverage
- `src/client/components/Personas/PersonaEditModal.tsx` - Modal component for editing existing personas with form validation and error handling
- `src/client/components/Personas/PersonaEditModal.test.tsx` - Unit tests for persona edit modal with comprehensive test coverage
- `src/client/components/Personas/PersonaMoodConsistency.tsx` - Comprehensive mood and personality consistency interface with analytics, drift detection, and response adaptation
- `src/client/components/Personas/PersonaMoodConsistency.test.tsx` - Unit tests for mood and personality consistency functionality
- `src/client/components/Chat/ChatInterface.tsx` - Real-time chat interface
- `src/client/components/Chat/ChatInterface.test.tsx` - Unit tests for chat interface
- `src/client/components/Chat/MessageList.tsx` - Enhanced message display component with platform-specific link rendering and improved file message display
- `src/client/components/Chat/MessageList.test.tsx` - Unit tests for message list
- `src/client/components/Chat/MessageInput.tsx` - Enhanced message input component with link detection, preview generation, and improved file upload functionality
- `src/client/components/Chat/MessageInput.test.tsx` - Unit tests for message input
- `src/client/components/Dashboard/InstructorDashboard.tsx` - Instructor dashboard
- `src/client/components/Dashboard/InstructorDashboard.test.tsx` - Unit tests for instructor dashboard
- `src/client/components/Dashboard/InstructorInterventionTools.tsx` - Comprehensive instructor intervention tools with alert monitoring, templates, and analytics
- `src/client/components/Dashboard/InstructorInterventionTools.css` - CSS styles for instructor intervention tools interface
- `src/client/components/Dashboard/InstructorInterventionTools.test.tsx` - Unit tests for instructor intervention tools
- `src/client/components/Dashboard/StudentDashboard.tsx` - Student dashboard
- `src/client/components/Dashboard/StudentDashboard.test.tsx` - Unit tests for student dashboard
- `src/client/components/Analytics/AnalyticsDashboard.tsx` - Analytics visualization with enhanced team performance tracking, conflict resolution metrics, and automated insights display
- `src/client/components/Analytics/AnalyticsDashboard.css` - CSS styles for analytics dashboard with team insights, conflict resolution, and health indicator styling
- `src/client/components/Analytics/AnalyticsDashboard.test.tsx` - Unit tests for analytics
- `src/client/components/Milestones/MilestoneList.tsx` - Milestone management
- `src/client/components/Milestones/MilestoneList.test.tsx` - Unit tests for milestone list
- `src/client/components/Milestones/MilestoneForm.tsx` - Milestone creation/editing
- `src/client/components/Milestones/MilestoneForm.test.tsx` - Unit tests for milestone form
- `src/client/components/Artifacts/ArtifactUpload.tsx` - File upload component
- `src/client/components/Artifacts/ArtifactUpload.test.tsx` - Unit tests for artifact upload
- `src/client/components/Meetings/MeetingList.tsx` - Meeting list component for displaying and managing scheduled meetings
- `src/client/components/Meetings/MeetingList.css` - CSS styles for meeting list component
- `src/client/components/Meetings/MeetingForm.tsx` - Meeting form component for creating and editing scheduled meetings
- `src/client/components/Meetings/MeetingForm.css` - CSS styles for meeting form component
- `src/client/components/Meetings/MeetingList.test.tsx` - Unit tests for meeting list component
- `src/client/components/Meetings/MeetingForm.test.tsx` - Unit tests for meeting form component
- `src/client/components/Artifacts/ArtifactList.tsx` - Artifact display component
- `src/client/components/Artifacts/ArtifactList.test.tsx` - Unit tests for artifact list

### Utilities and Hooks

- `src/client/hooks/useAuth.ts` - Authentication hook
- `src/client/hooks/useAuth.test.ts` - Unit tests for auth hook
- `src/client/hooks/useChat.ts` - Real-time chat hook
- `src/client/hooks/useChat.test.ts` - Unit tests for chat hook
- `src/client/hooks/useWebSocket.ts` - WebSocket connection hook
- `src/client/hooks/useWebSocket.test.ts` - Unit tests for WebSocket hook
- `src/client/utils/api.ts` - API client utilities
- `src/client/utils/api.test.ts` - Unit tests for API utilities
- `src/client/utils/validation.ts` - Form validation utilities
- `src/client/utils/validation.test.ts` - Unit tests for validation
- `src/client/utils/linkUtils.ts` - Comprehensive link utility service for detecting, parsing, and generating previews for external links
- `src/client/utils/linkUtils.test.ts` - Unit tests for link utilities with comprehensive test coverage

### Configuration and Setup

- `package.json` - Project dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `jest.config.js` - Jest testing configuration
- `webpack.config.js` - Webpack build configuration
- `docker-compose.yml` - Docker development environment
- `docker-compose.yml` - Docker production environment
- `.env.example` - Environment variables template
- `README.md` - Project documentation

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `MyComponent.tsx` and `MyComponent.test.tsx` in the same directory).
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration.

## Tasks

- [x] 1.0 Core System Architecture and Database Design
  - [x] 1.1 Set up project structure and development environment
  - [x] 1.2 Design and implement database schema for all entities
  - [x] 1.3 Set up database connection and configuration
  - [x] 1.4 Create database models with relationships and validation
  - [x] 1.5 Set up authentication system and user management
  - [x] 1.6 Configure role-based access control (RBAC)
  - [x] 1.7 Set up WebSocket server for real-time communication
  - [x] 1.8 Configure file storage system for artifacts
  - [x] 1.9 Set up logging and error handling infrastructure

- [x] 2.0 Persona Generation and Management System
  - [x] 2.1 Create persona data models and database schema
  - [x] 2.2 Implement AI service integration for persona generation
  - [x] 2.3 Build persona creation form with project-based suggestions
  - [x] 2.4 Implement persona customization interface
  - [x] 2.5 Create persona template system
  - [x] 2.6 Build persona management dashboard for instructors
  - [x] 2.7 Implement mid-project persona addition functionality
  - [x] 2.8 Create persona editing and modification interface
  - [x] 2.9 Add persona mood and personality consistency system

- [x] 3.0 Real-time Chat Interface and Communication System
  - [x] 3.1 Set up WebSocket connection management
  - [x] 3.2 Create real-time chat interface component
  - [x] 3.3 Implement message persistence and history
  - [x] 3.4 Build scheduled meeting system for milestones
  - [x] 3.5 Create file upload integration in chat
  - [x] 3.6 Implement external link support (Figma, GitHub, etc.)
  - [x] 3.7 Add conversation threading and organization
  - [x] 3.8 Implement chat notifications and status indicators
  - [x] 3.9 Create chat moderation and content filtering

- [ ] 4.0 Instructor Dashboard and Analytics
  - [x] 4.1 Build instructor dashboard layout and navigation
  - [x] 4.2 Create conversation monitoring interface
  - [x] 4.3 Implement analytics data collection and processing
  - [x] 4.4 Build analytics visualization components
  - [x] 4.5 Create team performance tracking system
  - [x] 4.6 Implement interaction pattern analysis
  - [x] 4.7 Add export functionality for conversation logs
  - [x] 4.8 Create instructor intervention tools
  - [ ] 4.9 Build department-wide analytics for administrators

- [ ] 5.0 Assessment and Milestone Management
  - [ ] 5.1 Create milestone data models and relationships
  - [ ] 5.2 Build milestone creation and management interface
  - [ ] 5.3 Implement milestone checkpoint system
  - [ ] 5.4 Create persona sign-off functionality
  - [ ] 5.5 Build custom evaluation rubric system
  - [ ] 5.6 Implement milestone completion tracking
  - [ ] 5.7 Create formal feedback collection system
  - [ ] 5.8 Build milestone reporting and analytics
  - [ ] 5.9 Implement persona satisfaction scoring

- [ ] 6.0 AI Integration and Persona Intelligence
  - [ ] 6.1 Set up AI service configuration and API integration
  - [ ] 6.2 Implement conversation context management
  - [ ] 6.3 Create personality consistency algorithms
  - [ ] 6.4 Build persona memory system for conversation history
  - [ ] 6.5 Implement mood tracking and response adaptation
  - [ ] 6.6 Create conflict generation and management system
  - [ ] 6.7 Build goal and priority management for personas
  - [ ] 6.8 Implement response quality and relevance filtering
  - [ ] 6.9 Create AI response caching and optimization

- [ ] 7.0 User Authentication and Role-Based Access Control
  - [ ] 7.1 Implement user registration and login system
  - [ ] 7.2 Create role-based access control middleware
  - [ ] 7.3 Build user profile management interface
  - [ ] 7.4 Implement session management and security
  - [ ] 7.5 Create password reset and account recovery
  - [ ] 7.6 Build user invitation and team management
  - [ ] 7.7 Implement audit logging for user actions
  - [ ] 7.8 Create user activity monitoring
  - [ ] 7.9 Build admin user management interface

- [ ] 8.0 File Upload and Artifact Management
  - [ ] 8.1 Set up file storage infrastructure
  - [ ] 8.2 Create file upload component with drag-and-drop
  - [ ] 8.3 Implement file type validation and security
  - [ ] 8.4 Build artifact organization and categorization
  - [ ] 8.5 Create file preview and download functionality
  - [ ] 8.6 Implement file versioning and history
  - [ ] 8.7 Build artifact sharing and permission system
  - [ ] 8.8 Create file cleanup and retention policies
  - [ ] 8.9 Implement artifact analytics and usage tracking

- [ ] 9.0 System Administration and Department-Wide Features
  - [ ] 9.1 Create system administration dashboard
  - [ ] 9.2 Implement department-wide user management
  - [ ] 9.3 Build system configuration management
  - [ ] 9.4 Create backup and data export functionality
  - [ ] 9.5 Implement system monitoring and health checks
  - [ ] 9.6 Build usage analytics and reporting
  - [ ] 9.7 Create system maintenance tools
  - [ ] 9.8 Implement data retention and cleanup policies
  - [ ] 9.9 Build system performance optimization tools

- [ ] 10.0 Testing, Documentation, and Deployment
  - [ ] 10.1 Write comprehensive unit tests for all components
  - [ ] 10.2 Create integration tests for API endpoints
  - [ ] 10.3 Build end-to-end tests for critical user flows
  - [ ] 10.4 Write API documentation and usage guides
  - [ ] 10.5 Create user documentation and training materials
  - [ ] 10.6 Set up CI/CD pipeline for automated testing
  - [ ] 10.7 Configure production deployment environment
  - [ ] 10.8 Implement monitoring and alerting systems
  - [ ] 10.9 Create disaster recovery and backup procedures

---

## 1. **Diagnose: Why are only "Basic Information" fields rendering?**

- The repeated test output and code inspection show that only the "Basic Information" section is visible in the rendered form during tests.
- This usually means:
  - There’s a runtime error in the component after the first section.
  - Or, a conditional is preventing the rest of the form from rendering.
  - Or, a TypeScript error is causing a silent failure.

---

## 2. **Immediate Next Steps**

### a. **Check for runtime errors in the component**

- If there’s a JavaScript/TypeScript error in the render, React will stop rendering further sections.
- The last tool call read the `handleNestedChange` function, which is a likely culprit for TypeScript errors.

### b. **Check for TypeScript errors**

- The last type-check run showed errors in `TemplateForm.tsx` related to the spread operator and possibly incorrect typing for nested state updates.

---

## 3. **Action: Fix the TypeScript Error in `handleNestedChange`**

The problematic code is:

```ts
[parent]: {
  ...prev[parent as keyof TemplateFormData],
  [field]: value,
},
```

If `prev[parent as keyof TemplateFormData]` is `undefined`, spreading it will cause a runtime error.

**Fix:** Default to an empty object if undefined:

```ts
[parent]: {
  ...(prev[parent as keyof TemplateFormData] || {}),
  [field]: value,
},
```

---

## 4. **Action: Ensure All Form Sections Render**

- After fixing the above, re-run the tests.
- If the tests still fail, check for any other runtime errors or missing/incorrect props.

---

## 5. **Action: Update Test Expectations**

- If the tests are looking for "Add" buttons but the UI now uses "Add Tag", "Add Trait", etc., update the test queries to match the new button text.
- If the tests expect "Update Template" but the button says "Create Template", update the test or the component for consistency.

---

## 6. **Execute the Fixes**

I will:

1. Fix the `handleNestedChange` function to avoid runtime errors.
2. Re-run the tests to see if the form renders all sections.
3. If button text mismatches remain, update the test files to match the new UI.

Let’s start by fixing the `handleNestedChange` function.
