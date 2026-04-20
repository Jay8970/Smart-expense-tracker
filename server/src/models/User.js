import bcrypt from "bcryptjs";
import crypto from "crypto";
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      required: true
    },
    phone: {
      type: String,
      trim: true,
      default: ""
    },
    profilePicture: {
      type: String,
      default: ""
    },
    defaultCurrency: {
      type: String,
      enum: ["CAD", "INR"],
      default: "CAD"
    },
    monthlySavingsGoal: {
      type: Number,
      min: 0,
      default: 0
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false
    },
    passwordResetToken: {
      type: String,
      select: false
    },
    passwordResetExpires: {
      type: Date,
      select: false
    }
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.createPasswordResetToken = function createPasswordResetToken() {
  const resetToken = crypto.randomBytes(24).toString("hex");
  this.passwordResetToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  this.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
  return resetToken;
};

export const User = mongoose.model("User", userSchema);
