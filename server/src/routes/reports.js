import express from "express";
import { protect } from "../middleware/auth.js";
import { Transaction } from "../models/Transaction.js";
import { convertAmount, getExchangeRates, roundToTwo } from "../utils/currency.js";
import { getCachedReportData, setCachedReportData } from "../utils/reportCache.js";

const router = express.Router();

router.use(protect);

function parseMonthYear(query) {
  const parsedMonth = Number(query.month);
  const parsedYear = Number(query.year);
  const now = new Date();
  const fallbackMonth = now.getMonth() + 1;
  const fallbackYear = now.getFullYear();

  return {
    month: Number.isInteger(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12 ? parsedMonth : fallbackMonth,
    year: Number.isInteger(parsedYear) ? parsedYear : fallbackYear
  };
}

function getMonthRange(year, month) {
  return {
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 1)
  };
}

async function buildReportData(userId, month, year) {
  const cached = getCachedReportData(userId, year, month);
  if (cached) {
    return cached;
  }

  const exchangeRate = await getExchangeRates();
  const { start, end } = getMonthRange(year, month);
  const transactions = await Transaction.find({
    user: userId,
    date: {
      $gte: start,
      $lt: end
    }
  }).sort({ date: 1, createdAt: 1 });

  const monthlyBucket = {
    month: new Intl.DateTimeFormat("en-CA", {
      month: "short",
      year: "numeric"
    }).format(start),
    monthSort: `${year}-${String(month).padStart(2, "0")}`,
    incomeCad: 0,
    expenseCad: 0,
    expenseOriginal: 0
  };
  const categoryTotals = new Map();
  let biggestExpense = null;

  for (const transaction of transactions) {
    const amountCad = roundToTwo(convertAmount(transaction.amount, transaction.currency, "CAD", exchangeRate));

    if (transaction.type === "income") {
      monthlyBucket.incomeCad += amountCad;
      continue;
    }

    monthlyBucket.expenseCad += amountCad;
    monthlyBucket.expenseOriginal += Number(transaction.amount || 0);
    categoryTotals.set(transaction.category, roundToTwo((categoryTotals.get(transaction.category) || 0) + amountCad));

    if (!biggestExpense || amountCad > biggestExpense.amountCad) {
      biggestExpense = {
        id: String(transaction._id),
        title: transaction.title,
        category: transaction.category,
        date: transaction.date,
        originalAmount: roundToTwo(transaction.amount),
        originalCurrency: transaction.currency,
        amountCad
      };
    }
  }

  const expensesByCategory = Array.from(categoryTotals.entries())
    .map(([category, amountCad]) => ({
      category,
      amountCad: roundToTwo(amountCad)
    }))
    .sort((a, b) => b.amountCad - a.amountCad);

  const monthlyTrend = transactions.length
    ? [{
        ...monthlyBucket,
        incomeCad: roundToTwo(monthlyBucket.incomeCad),
        expenseCad: roundToTwo(monthlyBucket.expenseCad),
        expenseOriginal: roundToTwo(monthlyBucket.expenseOriginal)
      }]
    : [];

  return setCachedReportData(userId, year, month, {
    analytics: {
      expensesByCategory,
      monthlyTrend
    },
    exchangeRate,
    summaryBase: {
      biggestExpense,
      mostSpentCategory: expensesByCategory[0] || null
    }
  });
}

router.get("/charts", async (req, res, next) => {
  try {
    const { month, year } = parseMonthYear(req.query);
    const reportData = await buildReportData(req.user._id, month, year);
    res.json({
      month,
      year,
      analytics: reportData.analytics
    });
  } catch (error) {
    next(error);
  }
});

router.get("/summary", async (req, res, next) => {
  try {
    const { month, year } = parseMonthYear(req.query);
    const displayCurrency = ["CAD", "INR"].includes(String(req.query.currency || "").toUpperCase())
      ? String(req.query.currency).toUpperCase()
      : (req.user.defaultCurrency || "CAD");
    const reportData = await buildReportData(req.user._id, month, year);
    const biggestExpense = reportData.summaryBase.biggestExpense
      ? {
          ...reportData.summaryBase.biggestExpense,
          currency: displayCurrency,
          amount: roundToTwo(
            convertAmount(reportData.summaryBase.biggestExpense.amountCad, "CAD", displayCurrency, reportData.exchangeRate)
          )
        }
      : null;
    const mostSpentCategory = reportData.summaryBase.mostSpentCategory
      ? {
          category: reportData.summaryBase.mostSpentCategory.category,
          currency: displayCurrency,
          amount: roundToTwo(
            convertAmount(reportData.summaryBase.mostSpentCategory.amountCad, "CAD", displayCurrency, reportData.exchangeRate)
          )
        }
      : null;

    res.json({
      month,
      year,
      currency: displayCurrency,
      biggestExpense,
      mostSpentCategory
    });
  } catch (error) {
    next(error);
  }
});

export default router;
