import mongoose, { Document } from "mongoose";

interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  profilePicture?: string;
  googleId?: string;
  isSuperUser?: boolean;
  subscription?: {
    planId: mongoose.Types.ObjectId;
    isPaid: boolean;
    paidAt?: Date;
    expiresAt?: Date;
    status: 'free' | 'active' | 'expired';
  };
}

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    profilePicture: { type: String },
    googleId: { type: String },
    isSuperUser: {
      type: Boolean,
      default: false
    },
    subscription: {
      planId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Plan"
      },
      isPaid: {
        type: Boolean,
        default: false
      },
      paidAt: {
        type: Date
      },
      expiresAt: {
        type: Date
      },
      status: {
        type: String,
        enum: ['free', 'active', 'expired'],
        default: 'free'
      }
    }
  },
  { timestamps: true }
);

const UserModel = mongoose.model<IUser>("User", userSchema);

// Export for both CommonJS and ES6
module.exports = UserModel;
export default UserModel;
