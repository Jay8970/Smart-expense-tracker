import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

export async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: "Please login to continue." });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.userId);

    if (!user) {
      return res.status(401).json({ message: "User account was not found." });
    }

    req.user = user;
    next();
  } catch (_error) {
    res.status(401).json({ message: "Session expired. Please login again." });
  }
}
