import express from "express";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { protect } from "../middleware/auth.js";
import { User } from "../models/User.js";

const router = express.Router();

function createToken(user) {
  return jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

function toAuthResponse(user) {
  return {
    token: createToken(user),
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      profilePicture: user.profilePicture,
      defaultCurrency: user.defaultCurrency,
      monthlySavingsGoal: user.monthlySavingsGoal
    }
  };
}

router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required." });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    const user = await User.create({ name, email, password });
    res.status(201).json(toAuthResponse(user));
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    res.json(toAuthResponse(user));
  } catch (error) {
    next(error);
  }
});

router.get("/me", protect, (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      profilePicture: req.user.profilePicture,
      defaultCurrency: req.user.defaultCurrency,
      monthlySavingsGoal: req.user.monthlySavingsGoal
    }
  });
});

router.put("/me", protect, async (req, res, next) => {
  try {
    const allowedFields = ["name", "email", "phone", "profilePicture", "defaultCurrency", "monthlySavingsGoal"];
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        req.user[field] = req.body[field];
      }
    }

    await req.user.save();
    res.json(toAuthResponse(req.user));
  } catch (error) {
    next(error);
  }
});

router.put("/password", protect, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select("+password");

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters." });
    }

    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ message: "Current password is incorrect." });
    }

    user.password = newPassword;
    await user.save();
    res.json({ message: "Password updated successfully." });
  } catch (error) {
    next(error);
  }
});

router.post("/forgot-password", async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "No account found with this email." });
    }

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    res.json({
      message: "Password reset token generated. In production, this token should be emailed to the user.",
      resetToken
    });
  } catch (error) {
    next(error);
  }
});

router.post("/reset-password", async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const hashedToken = crypto.createHash("sha256").update(token || "").digest("hex");
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() }
    }).select("+passwordResetToken +passwordResetExpires +password");

    if (!user) {
      return res.status(400).json({ message: "Reset token is invalid or expired." });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json(toAuthResponse(user));
  } catch (error) {
    next(error);
  }
});

export default router;
