import mongoose from "mongoose";

const budgetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    category: {
      type: String,
      trim: true,
      required: true
    },
    currency: {
      type: String,
      enum: ["INR", "CAD"],
      required: true
    },
    monthlyLimit: {
      type: Number,
      min: 0,
      required: true
    },
    isDemo: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

budgetSchema.index({ user: 1, category: 1, currency: 1 }, { unique: true });

export const Budget = mongoose.model("Budget", budgetSchema);
