import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "ClickUp Clone API",
      version: "1.0.0",
      description: `
        A comprehensive project management API with features including:
        - Workspace and team management
        - Hierarchical task organization (Workspaces → Spaces → Lists → Tasks)
        - Real-time collaboration via WebSockets
        - Recurring tasks with cron-based automation
        - Gantt charts with dependency cascading
        - Advanced analytics and reporting
        - File attachments via Cloudinary
        - Activity tracking and commenting
        - Custom fields and time tracking
        - Push notifications (FCM)
      `,
      contact: {
        name: "API Support",
        email: "support@clickupclone.com"
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT"
      }
    },
    servers: [
      {
        url: "http://localhost:5000",
        description: "Development server"
      },
      {
        url: "https://api.clickupclone.com",
        description: "Production server"
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your JWT token in the format: Bearer <token>"
        }
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "Error message"
            },
            stack: {
              type: "string",
              description: "Stack trace (development only)"
            }
          }
        },
        User: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              description: "User ID"
            },
            name: {
              type: "string",
              description: "User's full name"
            },
            email: {
              type: "string",
              format: "email",
              description: "User's email address"
            },
            createdAt: {
              type: "string",
              format: "date-time"
            }
          }
        },
        Workspace: {
          type: "object",
          properties: {
            _id: {
              type: "string"
            },
            name: {
              type: "string",
              description: "Workspace name"
            },
            owner: {
              type: "string",
              description: "Owner user ID"
            },
            members: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  user: {
                    type: "string",
                    description: "User ID"
                  },
                  role: {
                    type: "string",
                    enum: ["owner", "admin", "member"],
                    description: "User role in workspace"
                  },
                  joinedAt: {
                    type: "string",
                    format: "date-time"
                  }
                }
              }
            },
            createdAt: {
              type: "string",
              format: "date-time"
            }
          }
        },
        Space: {
          type: "object",
          properties: {
            _id: {
              type: "string"
            },
            name: {
              type: "string",
              description: "Space/Project name"
            },
            workspace: {
              type: "string",
              description: "Parent workspace ID"
            },
            owner: {
              type: "string",
              description: "Owner user ID"
            },
            members: {
              type: "array",
              items: {
                type: "object"
              }
            },
            createdAt: {
              type: "string",
              format: "date-time"
            }
          }
        },
        List: {
          type: "object",
          properties: {
            _id: {
              type: "string"
            },
            name: {
              type: "string",
              description: "List name"
            },
            space: {
              type: "string",
              description: "Parent space ID"
            },
            workspace: {
              type: "string",
              description: "Parent workspace ID"
            },
            createdAt: {
              type: "string",
              format: "date-time"
            }
          }
        },
        Task: {
          type: "object",
          properties: {
            _id: {
              type: "string"
            },
            title: {
              type: "string",
              description: "Task title"
            },
            description: {
              type: "string",
              description: "Task description"
            },
            status: {
              type: "string",
              enum: ["todo", "in-progress", "done"],
              description: "Task status"
            },
            priority: {
              type: "string",
              enum: ["low", "medium", "high", "urgent"],
              description: "Task priority"
            },
            list: {
              type: "string",
              description: "Parent list ID"
            },
            space: {
              type: "string",
              description: "Parent space ID"
            },
            workspace: {
              type: "string",
              description: "Parent workspace ID"
            },
            assignee: {
              type: "string",
              description: "Assigned user ID"
            },
            createdBy: {
              type: "string",
              description: "Creator user ID"
            },
            dueDate: {
              type: "string",
              format: "date-time",
              description: "Task due date"
            },
            startDate: {
              type: "string",
              format: "date-time",
              description: "Task start date (for Gantt)"
            },
            completedAt: {
              type: "string",
              format: "date-time",
              description: "Task completion timestamp"
            },
            isRecurring: {
              type: "boolean",
              description: "Whether task is recurring"
            },
            frequency: {
              type: "string",
              enum: ["daily", "weekly", "monthly", "custom"],
              description: "Recurrence frequency"
            },
            interval: {
              type: "number",
              description: "Recurrence interval (e.g., every 2 weeks)"
            },
            nextOccurrence: {
              type: "string",
              format: "date-time",
              description: "Next scheduled occurrence"
            },
            recurrenceEnd: {
              type: "string",
              format: "date-time",
              description: "When recurrence should stop"
            },
            isMilestone: {
              type: "boolean",
              description: "Whether task is a milestone (startDate === dueDate)"
            },
            customFieldValues: {
              type: "array",
              items: {
                type: "object"
              },
              description: "Custom field values"
            },
            createdAt: {
              type: "string",
              format: "date-time"
            },
            updatedAt: {
              type: "string",
              format: "date-time"
            }
          }
        },
        TaskDependency: {
          type: "object",
          properties: {
            _id: {
              type: "string"
            },
            dependencySource: {
              type: "string",
              description: "Source task ID (the task that must be completed first)"
            },
            dependencyTarget: {
              type: "string",
              description: "Target task ID (the task that depends on the source)"
            },
            type: {
              type: "string",
              enum: ["FS", "SS", "FF", "SF"],
              description: "Dependency type: FS (Finish-to-Start), SS (Start-to-Start), FF (Finish-to-Finish), SF (Start-to-Finish)"
            },
            workspace: {
              type: "string",
              description: "Parent workspace ID"
            },
            createdAt: {
              type: "string",
              format: "date-time"
            }
          }
        },
        Activity: {
          type: "object",
          properties: {
            _id: {
              type: "string"
            },
            task: {
              type: "string",
              description: "Task ID"
            },
            user: {
              type: "string",
              description: "User who performed the action"
            },
            type: {
              type: "string",
              enum: ["comment", "update"],
              description: "Activity type"
            },
            content: {
              type: "string",
              description: "Comment content or update description"
            },
            fieldChanged: {
              type: "string",
              description: "Field that was changed (for updates)"
            },
            oldValue: {
              type: "string",
              description: "Previous value (for updates)"
            },
            newValue: {
              type: "string",
              description: "New value (for updates)"
            },
            isSystemGenerated: {
              type: "boolean",
              description: "Whether this was auto-generated"
            },
            mentions: {
              type: "array",
              items: {
                type: "string"
              },
              description: "Mentioned user IDs"
            },
            reactions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  user: {
                    type: "string"
                  },
                  emoji: {
                    type: "string"
                  }
                }
              }
            },
            createdAt: {
              type: "string",
              format: "date-time"
            }
          }
        },
        Attachment: {
          type: "object",
          properties: {
            _id: {
              type: "string"
            },
            task: {
              type: "string",
              description: "Task ID"
            },
            uploadedBy: {
              type: "string",
              description: "User who uploaded the file"
            },
            fileName: {
              type: "string",
              description: "Original file name"
            },
            fileSize: {
              type: "number",
              description: "File size in bytes"
            },
            mimeType: {
              type: "string",
              description: "File MIME type"
            },
            cloudinaryUrl: {
              type: "string",
              description: "Cloudinary URL"
            },
            cloudinaryPublicId: {
              type: "string",
              description: "Cloudinary public ID"
            },
            thumbnailUrl: {
              type: "string",
              description: "Thumbnail URL (for images)"
            },
            createdAt: {
              type: "string",
              format: "date-time"
            }
          }
        },
        AnalyticsSummary: {
          type: "object",
          properties: {
            totalTasks: {
              type: "number",
              description: "Total number of tasks"
            },
            completedTasks: {
              type: "number",
              description: "Number of completed tasks"
            },
            completionRate: {
              type: "number",
              description: "Completion rate percentage"
            },
            priorityDistribution: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  label: {
                    type: "string"
                  },
                  value: {
                    type: "number"
                  }
                }
              },
              description: "Tasks grouped by priority"
            },
            statusDistribution: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  label: {
                    type: "string"
                  },
                  value: {
                    type: "number"
                  }
                }
              },
              description: "Tasks grouped by status"
            },
            velocity: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  date: {
                    type: "string"
                  },
                  completed: {
                    type: "number"
                  }
                }
              },
              description: "Tasks completed per day (last 14 days)"
            },
            leadTime: {
              type: "number",
              description: "Average days from creation to completion"
            }
          }
        },
        Plan: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              description: "Plan ID"
            },
            name: {
              type: "string",
              description: "Plan name"
            },
            price: {
              type: "number",
              description: "Plan price"
            },
            description: {
              type: "string",
              description: "Plan description"
            },
            features: {
              type: "object",
              properties: {
                maxWorkspaces: {
                  type: "number",
                  description: "Maximum number of workspaces allowed"
                },
                maxMembers: {
                  type: "number",
                  description: "Maximum number of members per workspace"
                },
                hasAccessControl: {
                  type: "boolean",
                  description: "Whether advanced access control is enabled"
                },
                messageLimit: {
                  type: "number",
                  description: "Maximum number of messages allowed"
                }
              }
            },
            isActive: {
              type: "boolean",
              description: "Whether the plan is active"
            },
            createdAt: {
              type: "string",
              format: "date-time"
            },
            updatedAt: {
              type: "string",
              format: "date-time"
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: "Auth",
        description: "Authentication and user management"
      },
      {
        name: "Workspaces",
        description: "Workspace management and member operations"
      },
      {
        name: "Invitations",
        description: "Workspace invitation system"
      },
      {
        name: "Spaces",
        description: "Space/Project management within workspaces"
      },
      {
        name: "Lists",
        description: "List management within spaces"
      },
      {
        name: "Tasks",
        description: "Task CRUD operations and management"
      },
      {
        name: "Task Dependencies",
        description: "Gantt chart dependencies with cascading logic"
      },
      {
        name: "Recurring Tasks",
        description: "Recurring task automation with cron"
      },
      {
        name: "Activities",
        description: "Task comments and activity tracking"
      },
      {
        name: "Attachments",
        description: "File uploads via Cloudinary"
      },
      {
        name: "Analytics",
        description: "Workspace analytics and reporting"
      },
      {
        name: "Custom Fields",
        description: "Custom field definitions and values"
      },
      {
        name: "Time Tracking",
        description: "Time entry management"
      },
      {
        name: "Notifications",
        description: "Push notifications and notification center"
      },
      {
        name: "Chat",
        description: "Real-time workspace chat"
      },
      {
        name: "Direct Messages",
        description: "Private messaging between users"
      },
      {
        name: "Plans",
        description: "Subscription plan management"
      },
      {
        name: "Super Admin",
        description: "Super admin dashboard and system management"
      }
    ]
  },
  apis: [
    "./src/routes/*.ts",
    "./src/routes/*.js",
    "./dist/routes/*.js"
  ]
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
