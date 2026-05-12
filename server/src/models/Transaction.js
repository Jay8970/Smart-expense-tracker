import mongoose from "mongoose";
import { encryptedStringField } from "../utils/fieldEncryption.js";

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
      ...encryptedStringField({ required: true, trim: true })
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
      ...encryptedStringField({ default: "Cash", trim: true })
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
      ...encryptedStringField({ default: "", trim: true })
    },
    receiptFile: {
      ...encryptedStringField({ default: "" })
    },
    receiptFileName: {
      ...encryptedStringField({ default: "", trim: true })
    },
    receiptMimeType: {
      type: String,
      trim: true,
      default: ""
    }
  },
  { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } }
);

export const Transaction = mongoose.model("Transaction", transactionSchema);
