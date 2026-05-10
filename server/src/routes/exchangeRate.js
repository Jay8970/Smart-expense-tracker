import express from "express";
import { formatExchangeRate, getExchangeRates } from "../utils/currency.js";

const router = express.Router();

router.get("/", async (_req, res, next) => {
  try {
    const exchangeRate = await getExchangeRates();
    res.json(formatExchangeRate(exchangeRate));
  } catch (error) {
    next(error);
  }
});

export default router;
