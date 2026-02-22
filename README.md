# SaaS Task Management Backend

A production-ready multi-tenant task management system built with Node.js, Express, TypeScript, and MongoDB. Features real-time collaboration, file attachments, push notifications, and comprehensive RBAC.

## Features

- **Multi-tenant Architecture**: Workspace-based isolation with role-based access control
- **Real-time Collaboration**: WebSocket-powered chat, typing indicators, and presence detection
- **File Attachments**: Direct S3/Spaces uploads with signed URLs
- **Push Notifications**: FCM integration with smart presence detection
- **Email System**: Invitation emails with Nodemailer
- **Advanced Queuing**: BullMQ for background jobs with Redis
- **Dual Logging**: Activity logs (ephemeral) and audit trails (compliance)
- **Soft Deletes**: Data retention for recovery and audit compliance
- **Advanced Queries**: Pagination, search, filtering on all list endpoints

## Tech Stack

- **Runtime**: Node.js v22
- **Framework**: Express.js
- **Language**: TypeScript (CommonJS)
- **Database**: MongoDB with Mongoose
- **Real-time**: Socket.io
- **Queue**: BullMQ + Redis
- **Storage**: AWS S3 / DigitalOcean Spaces
- **Push**: Firebase Cloud Messaging
- **Email**: Nodemailer
- **Validation**: Zod
- **Auth**: JWT

## Quick Start

### Prerequisites

- Node.js v22+
- MongoDB
- Redis (for BullMQ)
- AWS S3 or DigitalOcean Spaces (optional, for file uploads)
- Firebase project (optional, for push notifications)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

### Build for Production

```bash
npm run build
npm start
```

## Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname

# Authentication
JWT_SECRET=your-secret-key

# Redis (for BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379

# Email (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
APP_NAME=Your App Name

# File Storage (AWS S3)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-bucket
AWS_REGION=us-east-1

# Or DigitalOcean Spaces
DO_SPACES_KEY=your-key
DO_SPACES_SECRET=your-secret
DO_SPACES_BUCKET=your-bucket
DO_SPACES_ENDPOINT=nyc3.digitaloceanspaces.com

# Firebase (Push Notifications)
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'

# Optional
MAX_FILE_SIZE=10485760
```

## API Overview

### Authentication
```
POST   /api/auth/register    - Register new user
POST   /api/auth/login       - Login user
```

### Workspaces
```
POST   /api/workspaces           - Create workspace
GET    /api/workspaces           - List my workspaces
GET    /api/workspaces/:id       - Get workspace details
PUT    /api/workspaces/:id       - Update workspace
DELETE /api/workspaces/:id       - Delete workspace
```

### Projects
```
POST   /api/workspaces/:workspaceId/projects  - Create project
GET    /api/workspaces/:workspaceId/projects  - List projects
GET    /api/projects/:id                      - Get project
PATCH  /api/projects/:id                      - Update project
DELETE /api/projects/:id                      - Delete project
```

### Tasks
```
POST   /api/projects/:projectId/tasks    - Create task
GET    /api/projects/:projectId/tasks    - List tasks
GET    /api/tasks/:id                    - Get task
PATCH  /api/tasks/:id                    - Update task
DELETE /api/tasks/:id                    - Delete task
```

### Chat
```
POST   /api/workspaces/:workspaceId/chat  - Send message
GET    /api/workspaces/:workspaceId/chat  - Get messages
DELETE /api/chat/:id                      - Delete message
```

### File Attachments
```
POST   /api/tasks/:taskId/attachments/init-upload  - Get signed URL
POST   /api/tasks/:taskId/attachments/confirm      - Confirm upload
GET    /api/tasks/:taskId/attachments              - List attachments
DELETE /api/attachments/:id                        - Delete attachment
```

### Push Notifications
```
POST   /api/notifications/register-device    - Register device
DELETE /api/notifications/unregister-device  - Unregister device
GET    /api/notifications/devices            - List devices
```

## Architecture

### Design Patterns

- **Controller-Service-Repository**: Clean separation of concerns
- **Middleware Chain**: Authentication → RBAC → Validation → Controller
- **Soft Delete**: All resources use `isDeleted` flag for data retention
- **Dual Logging**: Activity logs (what happened) + Audit logs (what changed)

### Data Hierarchy

```
User
  └── Workspace (owner/admin/member)
       ├── Project
       │    └── Task (with assignee)
       ├── Chat Messages
       └── Invitations
```

### RBAC System

Workspace-level roles:
- **owner** (3): Full control
- **admin** (2): Manage projects and tasks
- **member** (1): Create and manage own tasks

## Real-time Features

### Socket.io Events

**Client → Server:**
- `join_workspace` - Join workspace room
- `leave_workspace` - Leave workspace room
- `chat:send` - Send chat message
- `chat:typing` - Typing indicator
- `chat:stop_typing` - Stop typing

**Server → Client:**
- `chat:new` - New message broadcast
- `chat:user_typing` - User typing
- `chat:user_stop_typing` - User stopped typing

## File Upload Flow

1. Client requests signed URL from backend
2. Backend generates S3 signed URL (15-min expiry)
3. Client uploads directly to S3
4. Client confirms upload with backend
5. Backend creates attachment record

## Push Notifications

Automatic notifications for:
- Task assignments (when assignee is offline)
- Chat mentions (when mentioned user is offline)
- Invitation accepted (when workspace owner is offline)

Smart presence detection prevents duplicate notifications for online users.

## Database Indexes

Optimized indexes for:
- Workspace membership lookups
- Project and task queries
- Chat message pagination
- Soft delete filtering
- User presence tracking

## Security

- JWT authentication on all protected routes
- Workspace-based RBAC
- Rate limiting (100 req/15min per IP)
- Input validation with Zod
- Signed URLs for file uploads
- Soft deletes for audit compliance

## Testing

```bash
# Run test suites
node test-chat-system.js
node test-attachments.js
```

## Documentation

- `ARCHITECTURE.md` - Detailed architecture guide
- `API_DOCUMENTATION.md` - Complete API reference
- `CHAT_SYSTEM.md` - Real-time chat implementation
- `FILE_UPLOAD_COMPLETE.md` - File attachment system
- `FCM_PUSH_NOTIFICATIONS.md` - Push notification setup
- `EMAIL_SETUP.md` - Email configuration guide
- `BULLMQ_IMPLEMENTATION_COMPLETE.md` - Queue system details

## Project Structure

```
backend/
├── src/
│   ├── config/          # Database, S3, Firebase config
│   ├── controllers/     # HTTP request handlers
│   ├── middlewares/     # Auth, RBAC, validation
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic layer
│   ├── socket/          # Socket.io handlers
│   ├── queues/          # BullMQ job definitions
│   ├── workers/         # Background job processors
│   ├── utils/           # Helper functions
│   ├── validators/      # Zod schemas
│   └── server.ts        # Application entry point
├── dist/                # Compiled JavaScript (gitignored)
├── .env                 # Environment variables (gitignored)
└── package.json
```

## Scripts

```bash
npm run dev              # Development with hot reload
npm run build            # Compile TypeScript
npm start                # Run production build
npm run dev:compiled     # Build and run once
npm run dev:watch        # Watch mode compilation
```

## Future Enhancements

- [ ] Task dependencies and subtasks
- [ ] Custom fields per workspace
- [ ] Time tracking
- [ ] Gantt charts
- [ ] Webhooks
- [ ] API versioning
- [ ] Advanced analytics dashboard
- [ ] Mobile apps (React Native)

## License

ISC

## Support

For issues and questions, please refer to the documentation files or create an issue in the repository.
