const mongoose = require("mongoose");

interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  profilePicture?: string;
  googleId?: string;
}

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    profilePicture: { type: String },
    googleId: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);

export {};
