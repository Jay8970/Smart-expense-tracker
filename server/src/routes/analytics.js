import express from "express";
import { protect } from "../middleware/auth.js";
import { Budget } from "../models/Budget.js";
import { Goal } from "../models/Goal.js";
import { Transaction } from "../models/Transaction.js";
import { formatExchangeRate, getExchangeRates, toCad } from "../utils/currency.js";

const router = express.Router();

router.use(protect);

function monthKey(date) {
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    year: "numeric"
  }).format(new Date(date));
}

function monthSortKey(date) {
  const itemDate = new Date(date);
  return `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, "0")}`;
}

function emptyCurrencyTotals() {
  return {
    CAD: 0,
    INR: 0
  };
}

router.get("/", async (req, res, next) => {
  try {
    const exchangeRates = await getExchangeRates();
    const [transactions, goals, budgets] = await Promise.all([
      Transaction.find({ user: req.user._id }),
      Goal.find({ user: req.user._id }),
      Budget.find({ user: req.user._id })
    ]);

    const summaryByCurrency = {
      CAD: { income: 0, expense: 0, balance: 0 },
      INR: { income: 0, expense: 0, balance: 0 }
    };
    const monthlySpendingByCurrency = emptyCurrencyTotals();
    const futurePlannedByCurrency = emptyCurrencyTotals();
    const now = new Date();
    const currentMonthCategorySpend = {};

    for (const item of transactions) {
      const bucket = summaryByCurrency[item.currency];
      if (!bucket) continue;
      if (item.type === "income") bucket.income += item.amount;
      if (item.type === "expense") bucket.expense += item.amount;
      bucket.balance = bucket.income - bucket.expense;

      const itemDate = new Date(item.date);
      const isCurrentMonth =
        item.type === "expense" &&
        itemDate.getFullYear() === now.getFullYear() &&
        itemDate.getMonth() === now.getMonth();

      if (isCurrentMonth) {
        monthlySpendingByCurrency[item.currency] += item.amount;
        currentMonthCategorySpend[`${item.category}:${item.currency}`] =
          (currentMonthCategorySpend[`${item.category}:${item.currency}`] || 0) + item.amount;
      }
    }

    let savedCad = 0;
    let plannedCad = 0;

    for (const goal of goals) {
      futurePlannedByCurrency[goal.currency] += goal.targetAmount;
      savedCad += toCad(goal.savedAmount, goal.currency, exchangeRates);
      plannedCad += toCad(goal.targetAmount, goal.currency, exchangeRates);
    }

    const summary = transactions.reduce(
      (acc, item) => {
        const amountCad = toCad(item.amount, item.currency, exchangeRates);
        if (item.type === "income") acc.incomeCad += amountCad;
        if (item.type === "expense") acc.expenseCad += amountCad;
        acc.balanceCad = acc.incomeCad - acc.expenseCad;
        return acc;
      },
      { incomeCad: 0, expenseCad: 0, balanceCad: 0 }
    );

    const expensesByCategory = Object.values(
      transactions
        .filter((item) => item.type === "expense")
        .reduce((acc, item) => {
          const key = item.category;
          acc[key] ||= { category: key, amountCad: 0 };
          acc[key].amountCad += toCad(item.amount, item.currency, exchangeRates);
          return acc;
        }, {})
    ).sort((a, b) => b.amountCad - a.amountCad);

    const monthlyTrend = Object.values(
      transactions.reduce((acc, item) => {
        const key = monthKey(item.date);
        acc[key] ||= {
          month: key,
          monthSort: monthSortKey(item.date),
          incomeCad: 0,
          expenseCad: 0,
          expenseOriginal: 0
        };
        acc[key][item.type === "income" ? "incomeCad" : "expenseCad"] += toCad(
          item.amount,
          item.currency,
          exchangeRates
        );
        if (item.type === "expense") {
          acc[key].expenseOriginal += item.amount;
        }
        return acc;
      }, {})
    ).sort((a, b) => a.monthSort.localeCompare(b.monthSort));

    const topExpenseCategory = expensesByCategory[0]?.category || "No expenses yet";
    const savingsGoalProgress = plannedCad > 0 ? Math.round((savedCad / plannedCad) * 100) : 0;
    const budgetUsage = budgets
      .map((budget) => {
        const usedAmount = currentMonthCategorySpend[`${budget.category}:${budget.currency}`] || 0;
        const usedPercent = budget.monthlyLimit > 0 ? Math.round((usedAmount / budget.monthlyLimit) * 100) : 0;
        return {
          id: budget._id,
          category: budget.category,
          currency: budget.currency,
          monthlyLimit: budget.monthlyLimit,
          usedAmount,
          usedPercent,
          message: `You already used ${usedPercent}% of your ${budget.category} budget this month.`
        };
      })
      .sort((a, b) => b.usedPercent - a.usedPercent);

    const budgetWarnings = budgetUsage
      .filter((warning) => warning.usedPercent >= 80)
      .sort((a, b) => b.usedPercent - a.usedPercent);

    const dashboard = {
      totalIncome: {
        CAD: summaryByCurrency.CAD.income,
        INR: summaryByCurrency.INR.income
      },
      totalExpense: {
        CAD: summaryByCurrency.CAD.expense,
        INR: summaryByCurrency.INR.expense
      },
      remainingBalance: {
        CAD: summaryByCurrency.CAD.balance,
        INR: summaryByCurrency.INR.balance
      },
      futurePlanned: futurePlannedByCurrency,
      monthlySpending: monthlySpendingByCurrency,
      topExpenseCategory,
      savingsGoalProgress,
      budgetWarnings,
      budgetUsage
    };

    res.json({
      summary,
      summaryByCurrency,
      exchangeRate: formatExchangeRate(exchangeRates),
      dashboard,
      expensesByCategory,
      monthlyTrend
    });
  } catch (error) {
    next(error);
  }
});

export default router;
