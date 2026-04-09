import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { User } from "../models/User.ts";

// Extend req to include user
interface AuthenticatedRequest extends Request {
  user?: any;
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ message: "Unauthorized: missing Bearer token." });
      return;
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET || "pes-secret";
    const decoded = jwt.verify(token, secret) as { id?: string; role?: string };

    if (!decoded?.id) {
      res.status(401).json({ message: "Unauthorized: invalid token payload." });
      return;
    }

    const user = await User.findById(decoded.id).select("_id name email role isTA");
    if (!user) {
      res.status(401).json({ message: "Unauthorized: user not found." });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: "Unauthorized: invalid or expired token." });
  }
};
export default AuthenticatedRequest;