import mongoose from "mongoose";

const exchangeRateSchema = new mongoose.Schema(
  {
    base: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    rates: {
      type: Map,
      of: Number,
      default: {}
    },
    fetchedAt: {
      type: Date,
      required: true
    },
    source: {
      type: String,
      default: "frankfurter"
    }
  },
  { timestamps: true }
);

export const ExchangeRate = mongoose.model("ExchangeRate", exchangeRateSchema);
