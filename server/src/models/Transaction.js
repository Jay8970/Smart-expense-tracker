import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ["income", "expense"],
      required: true
    },
    title: {
      type: String,
      trim: true,
      required: true
    },
    category: {
      type: String,
      trim: true,
      required: true
    },
    amount: {
      type: Number,
      min: 0,
      required: true
    },
    currency: {
      type: String,
      enum: ["INR", "CAD"],
      required: true
    },
    date: {
      type: Date,
      required: true,
      default: Date.now
    },
    paymentMethod: {
      type: String,
      trim: true,
      default: "Cash"
    },
    recurring: {
      type: Boolean,
      default: false
    },
    recurrenceFrequency: {
      type: String,
      enum: ["None", "Weekly", "Monthly", "Yearly"],
      default: "None"
    },
    isDemo: {
      type: Boolean,
      default: false
    },
    note: {
      type: String,
      trim: true,
      default: ""
    }
  },
  { timestamps: true }
);

export const Transaction = mongoose.model("Transaction", transactionSchema);
