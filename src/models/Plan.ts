const mongoose = require("mongoose");

interface IPlan extends Document {
  name: string;
  price: number;
  description: string;
  parentPlanId?: string;
  features: {
    maxWorkspaces: number;
    maxMembers: number;
    maxAdmins: number;
    maxSpaces: number;
    maxLists: number;
    maxFolders: number;
    maxTasks: number;
    hasAccessControl: boolean;
    hasGroupChat: boolean;
    messageLimit: number;
    announcementCooldown: number;
    accessControlTier: 'none' | 'pro' | 'advanced';
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    parentPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan',
      default: null
    },
    features: {
      maxWorkspaces: {
        type: Number,
        required: true,
        min: -1, // -1 means unlimited
        default: 1
      },
      maxMembers: {
        type: Number,
        required: true,
        min: -1, // -1 means unlimited
        default: 5
      },
      maxAdmins: {
        type: Number,
        required: true,
        min: -1, // -1 means unlimited
        default: 1
      },
      maxSpaces: {
        type: Number,
        required: true,
        min: -1, // -1 means unlimited
        default: 10
      },
      maxLists: {
        type: Number,
        required: true,
        min: -1, // -1 means unlimited
        default: 50
      },
      maxFolders: {
        type: Number,
        required: true,
        min: -1, // -1 means unlimited
        default: 20
      },
      maxTasks: {
        type: Number,
        required: true,
        min: -1, // -1 means unlimited
        default: 100
      },
      hasAccessControl: {
        type: Boolean,
        required: true,
        default: false
      },
      hasGroupChat: {
        type: Boolean,
        required: true,
        default: false
      },
      messageLimit: {
        type: Number,
        required: true,
        min: -1, // -1 means unlimited
        default: 100
      },
      announcementCooldown: {
        type: Number,
        required: true,
        min: 0, // in hours
        default: 24
      },
      accessControlTier: {
        type: String,
        enum: ['none', 'pro', 'advanced'],
        required: true,
        default: 'none'
      }
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { 
    timestamps: true 
  }
);

// Index for active plans
planSchema.index({ isActive: 1 });

module.exports = mongoose.model("Plan", planSchema);

export {};
