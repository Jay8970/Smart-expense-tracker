import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

const USER_CACHE_TTL_MS = 5 * 60 * 1000;
const userCache = new Map();
const authUserFields = "_id name email phone profilePicture defaultCurrency monthlySavingsGoal";

function getCachedUser(userId) {
  const cached = userCache.get(String(userId));
  if (!cached) return null;

  if (cached.expiresAt <= Date.now()) {
    userCache.delete(String(userId));
    return null;
  }

  return cached.user;
}

export function primeUserCache(user) {
  if (!user?._id) return;

  userCache.set(String(user._id), {
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      profilePicture: user.profilePicture,
      defaultCurrency: user.defaultCurrency,
      monthlySavingsGoal: user.monthlySavingsGoal
    },
    expiresAt: Date.now() + USER_CACHE_TTL_MS
  });
}

export function clearUserCache(userId) {
  if (!userId) return;
  userCache.delete(String(userId));
}

export async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: "Please login to continue." });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const cachedUser = getCachedUser(payload.userId);
    if (cachedUser) {
      req.user = cachedUser;
      next();
      return;
    }

    const user = await User.findById(payload.userId).select(authUserFields).lean();

    if (!user) {
      return res.status(401).json({ message: "User account was not found." });
    }

    primeUserCache(user);
    req.user = user;
    next();
  } catch (_error) {
    res.status(401).json({ message: "Session expired. Please login again." });
  }
}
