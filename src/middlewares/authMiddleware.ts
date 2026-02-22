import { Request, Response, NextFunction } from "express";

const jwt = require("jsonwebtoken");

interface DecodedToken {
  id: string;
  iat: number;
  exp: number;
}

interface AuthRequest extends Request {
  user?: {
    id: string;
  };
}

const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Check if Authorization header exists
    if (!req.headers.authorization || !req.headers.authorization.startsWith("Bearer")) {
      console.error("[Auth] Missing or invalid Authorization header");
      return res.status(401).json({
        success: false,
        message: "Not authorized to access this route"
      });
    }

    // Extract token
    const token = req.headers.authorization.split(" ")[1];

    // Check if token exists after split
    if (!token || token === "null" || token === "undefined") {
      console.error("[Auth] Token is missing or invalid");
      return res.status(401).json({
        success: false,
        message: "Not authorized to access this route"
      });
    }

    // Verify JWT token with try-catch
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as DecodedToken;
      
      // Attach user to request
      req.user = { id: decoded.id };
      
      // Continue to next middleware
      next();
    } catch (jwtError: any) {
      // Handle specific JWT errors
      if (jwtError.name === "TokenExpiredError") {
        console.error("[Auth] JWT Error: Token expired");
        return res.status(401).json({
          success: false,
          message: "Token expired"
        });
      }
      
      if (jwtError.name === "JsonWebTokenError") {
        console.error("[Auth] JWT Error:", jwtError.message);
        return res.status(401).json({
          success: false,
          message: "Invalid token"
        });
      }

      // Handle any other JWT errors
      console.error("[Auth] JWT Error:", jwtError.message);
      return res.status(401).json({
        success: false,
        message: "Authentication failed"
      });
    }
  } catch (error: any) {
    // Catch any unexpected errors
    console.error("[Auth] Unexpected error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error during authentication"
    });
  }
};

module.exports = { protect };
export {};
