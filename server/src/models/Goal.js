import mongoose from "mongoose";
import { encryptedStringField } from "../utils/fieldEncryption.js";

const goalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    title: {
      ...encryptedStringField({ required: true, trim: true })
    },
    targetAmount: {
      type: Number,
      min: 0,
      required: true
    },
    savedAmount: {
      type: Number,
      min: 0,
      default: 0
    },
    currency: {
      type: String,
      enum: ["INR", "CAD"],
      required: true
    },
    targetDate: {
      type: Date,
      required: true
    },
    category: {
      type: String,
      trim: true,
      default: "Future plan"
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium"
    },
    status: {
      type: String,
      enum: ["Planning", "Saving", "Completed"],
      default: "Planning"
    },
    isDemo: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

goalSchema.virtual("remainingAmount").get(function getRemainingAmount() {
  return Math.max(this.targetAmount - this.savedAmount, 0);
});

goalSchema.virtual("monthlySavingsNeeded").get(function getMonthlySavingsNeeded() {
  const now = new Date();
  const target = new Date(this.targetDate);
  const months =
    (target.getFullYear() - now.getFullYear()) * 12 + target.getMonth() - now.getMonth();
  const safeMonths = Math.max(months, 1);
  return Math.ceil(this.remainingAmount / safeMonths);
});

goalSchema.set("toJSON", { virtuals: true, getters: true });
goalSchema.set("toObject", { virtuals: true, getters: true });

export const Goal = mongoose.model("Goal", goalSchema);
