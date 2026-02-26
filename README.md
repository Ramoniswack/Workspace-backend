# SaaS Task Management Backend

A production-ready multi-tenant task management system with subscription management, built with Node.js, Express, TypeScript, and MongoDB. Features real-time collaboration, file attachments, push notifications, comprehensive RBAC, and flexible subscription plans.

## Features

### Core Features
- **Multi-tenant Architecture**: Workspace-based isolation with role-based access control
- **Subscription Management**: Flexible plan system with global usage limits
- **Real-time Collaboration**: WebSocket-powered chat, typing indicators, and presence detection
- **File Attachments**: Cloudinary integration for image and file uploads
- **Push Notifications**: Firebase Cloud Messaging with smart presence detection
- **Email System**: Dual email providers (Nodemailer + Resend) for invitations and notifications
- **Advanced Analytics**: Performance tracking, time tracking, and activity monitoring
- **Dual Logging**: Activity logs (ephemeral) and audit trails (compliance)
- **Soft Deletes**: Data retention for recovery and audit compliance
- **Advanced Queries**: Pagination, search, filtering on all list endpoints

### Subscription System
- **Global Limits**: Usage calculated across ALL workspaces owned by a user
- **Plan Inheritance**: Super users can create plans based on existing plans
- **Access Control Tiers**: Basic, Pro, Advanced permission systems
- **Dynamic Limits**: All limits fetched from database, fully configurable
- **Owner-based Enforcement**: Limits based on workspace owner's subscription
- **Feature Flags**: Group chat, access control, message limits, announcement cooldowns

### Advanced Features
- **Custom Fields**: Workspace-specific custom field definitions
- **Time Tracking**: Built-in time tracking with analytics
- **Recurring Tasks**: Automated task creation with cron scheduling
- **Task Dependencies**: Task relationship management
- **Gantt Charts**: Project timeline visualization
- **Document Management**: Collaborative document editing
- **Search**: Full-text search across workspaces
- **Feedback System**: User feedback collection and management

## Tech Stack

- **Runtime**: Node.js v22
- **Framework**: Express.js v5
- **Language**: TypeScript (CommonJS)
- **Database**: MongoDB with Mongoose
- **Real-time**: Socket.io v4
- **Storage**: Cloudinary (images & files)
- **Push**: Firebase Cloud Messaging
- **Email**: Nodemailer + Resend
- **Validation**: Zod v4
- **Auth**: JWT
- **Documentation**: Swagger/OpenAPI

## Quick Start

### Prerequisites

- Node.js v22+
- MongoDB (local or Atlas)
- Cloudinary account (for file uploads)
- Firebase project (for push notifications and Google OAuth)
- SMTP server or Resend API key (for emails)

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

# Create super admin user (optional)
node create-super-admin.js

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
FRONTEND_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname

# Authentication
JWT_SECRET=your-secret-key-min-32-chars

# Email (Nodemailer - Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
APP_NAME=Your App Name

# Email (Resend - Optional)
RESEND_API_KEY=re_your_api_key

# Cloudinary (File Storage)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Firebase (Push Notifications & Google OAuth)
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'
FIREBASE_VAPID_KEY=your-vapid-key

# Optional
MAX_FILE_SIZE=10485760
```

## API Documentation

### Swagger UI
Access interactive API documentation at:
```
http://localhost:5000/api-docs
```

### Authentication
```
POST   /api/auth/register              - Register new user
POST   /api/auth/login                 - Login with email/password
POST   /api/auth/google                - Login with Google OAuth
POST   /api/auth/logout                - Logout user
GET    /api/auth/me                    - Get current user
```

### Subscription Management
```
GET    /api/subscription/info          - Get user's subscription info
GET    /api/plans                      - List all active plans
GET    /api/plans/:id                  - Get plan details
POST   /api/plans                      - Create plan (Super Admin)
PUT    /api/plans/:id                  - Update plan (Super Admin)
DELETE /api/plans/:id                  - Deactivate plan (Super Admin)
```

### Super Admin
```
GET    /api/super-admin/settings       - Get system settings
PUT    /api/super-admin/settings       - Update system settings
GET    /api/super-admin/users          - List all users
GET    /api/super-admin/analytics      - Get system analytics
```

### Workspaces
```
POST   /api/workspaces                 - Create workspace
GET    /api/workspaces                 - List my workspaces
GET    /api/workspaces/:id             - Get workspace details
PUT    /api/workspaces/:id             - Update workspace
DELETE /api/workspaces/:id             - Delete workspace
POST   /api/workspaces/:id/invite      - Invite member
GET    /api/workspaces/:id/members     - List members
```

### Spaces
```
POST   /api/workspaces/:workspaceId/spaces  - Create space
GET    /api/workspaces/:workspaceId/spaces  - List spaces
GET    /api/spaces/:id                      - Get space
PUT    /api/spaces/:id                      - Update space
DELETE /api/spaces/:id                      - Delete space
```

### Folders
```
POST   /api/spaces/:spaceId/folders    - Create folder
GET    /api/spaces/:spaceId/folders    - List folders
GET    /api/folders/:id                - Get folder
PUT    /api/folders/:id                - Update folder
DELETE /api/folders/:id                - Delete folder
```

### Lists
```
POST   /api/spaces/:spaceId/lists      - Create list
GET    /api/spaces/:spaceId/lists      - List lists
GET    /api/lists/:id                  - Get list
PUT    /api/lists/:id                  - Update list
DELETE /api/lists/:id                  - Delete list
```

### Tasks
```
POST   /api/lists/:listId/tasks        - Create task
GET    /api/lists/:listId/tasks        - List tasks
GET    /api/tasks/:id                  - Get task
PUT    /api/tasks/:id                  - Update task
DELETE /api/tasks/:id                  - Delete task
POST   /api/tasks/:id/comments         - Add comment
GET    /api/tasks/:id/comments         - List comments
```

### Chat & Direct Messages
```
POST   /api/workspaces/:workspaceId/chat  - Send message
GET    /api/workspaces/:workspaceId/chat  - Get messages
DELETE /api/chat/:id                      - Delete message
POST   /api/direct-messages                - Send DM
GET    /api/direct-messages                - Get DMs
```

### Attachments
```
POST   /api/attachments/upload         - Upload file
GET    /api/attachments/:id            - Get attachment
DELETE /api/attachments/:id            - Delete attachment
```

### Notifications
```
POST   /api/notifications/register-device    - Register device
DELETE /api/notifications/unregister-device  - Unregister device
GET    /api/notifications                    - List notifications
PUT    /api/notifications/:id/read           - Mark as read
```

### Analytics & Performance
```
GET    /api/analytics/workspace/:id    - Workspace analytics
GET    /api/analytics/user/:id         - User analytics
GET    /api/performance/metrics        - Performance metrics
GET    /api/time-tracking              - Time tracking data
```

### Feedback
```
POST   /api/feedback                   - Submit feedback
GET    /api/feedback                   - List feedback (Super Admin)
PUT    /api/feedback/:id               - Update feedback status
```

## Architecture

### Design Patterns

- **Controller-Service-Repository**: Clean separation of concerns
- **Middleware Chain**: Authentication → Subscription Limits → RBAC → Validation → Controller
- **Soft Delete**: All resources use `isDeleted` flag for data retention
- **Dual Logging**: Activity logs (what happened) + Audit logs (what changed)
- **Global Limits**: Usage calculated across all workspaces owned by a user
- **Owner-based Enforcement**: Limits enforced based on workspace owner's subscription

### Data Hierarchy

```
User (with Subscription)
  └── Workspace (owner/admin/member)
       ├── Space
       │    ├── Folder
       │    └── List
       │         └── Task (with assignee, comments, attachments)
       ├── Chat Messages
       ├── Direct Messages
       ├── Custom Fields
       └── Invitations
```

### Subscription System

```
Plan (created by Super Admin)
  ├── Features
  │    ├── maxWorkspaces
  │    ├── maxSpaces
  │    ├── maxLists
  │    ├── maxFolders
  │    ├── maxTasks
  │    ├── maxMembers
  │    ├── maxAdmins
  │    ├── hasAccessControl
  │    ├── accessControlTier
  │    ├── hasGroupChat
  │    ├── messageLimit
  │    └── announcementCooldown
  └── Parent Plan (optional inheritance)

User Subscription
  ├── isPaid: boolean
  ├── status: trial | active | expired
  ├── planId: reference to Plan
  ├── trialStartedAt: Date
  └── Global Usage (across ALL owned workspaces)
       ├── totalWorkspaces
       ├── totalSpaces
       ├── totalLists
       ├── totalFolders
       └── totalTasks
```

### RBAC System

**Workspace-level roles:**
- **owner** (3): Full control, subscription management
- **admin** (2): Manage spaces, lists, tasks, members
- **member** (1): Create and manage assigned tasks

**Access Control Tiers:**
- **none**: No custom permissions
- **basic**: Basic permission management
- **pro**: Advanced permission management
- **advanced**: Full granular control

## Real-time Features

### Socket.io Events

**Client → Server:**
- `join_workspace` - Join workspace room
- `leave_workspace` - Leave workspace room
- `chat:send` - Send chat message
- `chat:typing` - Typing indicator
- `chat:stop_typing` - Stop typing
- `presence:online` - User online
- `presence:offline` - User offline

**Server → Client:**
- `chat:new` - New message broadcast
- `chat:user_typing` - User typing
- `chat:user_stop_typing` - User stopped typing
- `notification:new` - New notification
- `task:updated` - Task updated
- `presence:user_online` - User came online
- `presence:user_offline` - User went offline

## File Upload Flow

1. Client uploads file to backend endpoint
2. Backend validates file (type, size)
3. Backend uploads to Cloudinary
4. Backend creates attachment record
5. Backend returns attachment details with URL

## Push Notifications

Automatic notifications for:
- Task assignments (when assignee is offline)
- Task mentions (when mentioned user is offline)
- Chat mentions (when mentioned user is offline)
- Invitation accepted (when workspace owner is offline)
- Comments on tasks (when task creator is offline)

Smart presence detection prevents duplicate notifications for online users.

## Subscription Limits

### Global Enforcement
- All limits calculated across ALL workspaces owned by a user
- Limits enforced based on workspace OWNER's subscription
- Premium user in Free workspace = restricted by Free limits
- Free user in Premium workspace = allowed by Premium limits

### Limit Checks
- Workspace creation: Before creating new workspace
- Space creation: Before creating new space
- List creation: Before creating new list
- Folder creation: Before creating new folder
- Task creation: Before creating new task
- Member invitation: Before inviting new member

### User-Friendly Errors
All limit errors include:
- Clear message explaining the limit
- Current usage count
- Maximum allowed count
- Upgrade action prompt
- Feature name for context

## Database Indexes

Optimized indexes for:
- Workspace membership lookups
- Space, list, folder, task queries
- Chat message pagination
- Soft delete filtering
- User presence tracking
- Subscription lookups
- Activity log queries

## Security

- JWT authentication on all protected routes
- Workspace-based RBAC with subscription limits
- Rate limiting (100 req/15min per IP)
- Input validation with Zod
- Cloudinary signed uploads
- Soft deletes for audit compliance
- Super admin privilege checks
- Firebase Admin SDK for secure OAuth

## Project Structure

```
backend/
├── src/
│   ├── config/          # Database, Cloudinary, Firebase, Swagger config
│   ├── controllers/     # HTTP request handlers
│   ├── middlewares/     # Auth, RBAC, subscription, validation
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API route definitions with Swagger docs
│   ├── services/        # Business logic layer
│   ├── socket/          # Socket.io handlers
│   ├── utils/           # Helper functions
│   ├── validators/      # Zod schemas
│   ├── permissions/     # RBAC permission definitions
│   ├── scripts/         # Utility scripts
│   └── server.ts        # Application entry point
├── dist/                # Compiled JavaScript (gitignored)
├── .env                 # Environment variables (gitignored)
├── create-super-admin.js # Super admin creation script
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

## Super Admin Setup

Create a super admin user to access admin features:

```bash
node create-super-admin.js
```

Follow the prompts to create a super admin account. Super admins can:
- Create and manage subscription plans
- View system analytics
- Manage all users
- Configure system settings
- View all feedback

## Testing

The system includes comprehensive testing for:
- Authentication flows
- Subscription limit enforcement
- RBAC permissions
- Real-time features
- File uploads
- Push notifications

## Documentation

- `API_DOCUMENTATION.md` - Complete API reference
- `ARCHITECTURE.md` - Detailed architecture guide
- `SUBSCRIPTION_LIMITS_IMPLEMENTATION.md` - Subscription system details
- `ACCESS_CONTROL_TIERS_IMPLEMENTATION.md` - RBAC implementation
- `CHAT_SYSTEM.md` - Real-time chat implementation
- `CLOUDINARY_MIGRATION_COMPLETE.md` - File upload system
- `ANALYTICS_DASHBOARD.md` - Analytics implementation
- `ACTIVITY_SYSTEM_COMPLETE.md` - Activity logging

## API Versioning

Current version: v1 (implicit)
All routes are prefixed with `/api/`

## Rate Limiting

- Default: 100 requests per 15 minutes per IP
- Configurable per route
- Bypass for authenticated super admins

## Error Handling

Standardized error responses:
```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE",
  "action": "upgrade",
  "feature": "workspaces"
}
```

## Future Enhancements

- [ ] Webhooks for external integrations
- [ ] API versioning (v2)
- [ ] Advanced analytics dashboard
- [ ] Mobile apps (React Native)
- [ ] Stripe payment integration
- [ ] Multi-language support
- [ ] Advanced reporting
- [ ] Export functionality (PDF, CSV)

## License

ISC

## Support

For issues and questions:
1. Check the documentation files
2. Review Swagger API docs at `/api-docs`
3. Create an issue in the repository
4. Contact support team

## Contributors

Built with ❤️ by the development team.
