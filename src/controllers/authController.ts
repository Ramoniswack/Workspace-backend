const bcrypt = require("bcryptjs");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");

const registerUser = async (req: any, res: any) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please provide all fields" });
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword
    });

    // STANDARDIZED RESPONSE - matches login format
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      token: generateToken(user._id.toString(), user.email, user.name),
      user: {
        _id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error instanceof Error ? error.message : "Unknown error" });
  }
};

const loginUser = async (req: any, res: any) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Please provide email and password" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // STANDARDIZED RESPONSE
    res.json({
      success: true,
      message: "Logged in successfully",
      token: generateToken(user._id.toString(), user.email, user.name),
      user: {
        _id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error instanceof Error ? error.message : "Unknown error" });
  }
};

module.exports = { registerUser, loginUser };

export {};
