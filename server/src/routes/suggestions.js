import express from "express";
import { protect } from "../middleware/auth.js";
import { Budget } from "../models/Budget.js";
import { Goal } from "../models/Goal.js";
import { Transaction } from "../models/Transaction.js";
import { getExchangeRates } from "../utils/currency.js";
import { generateSuggestions } from "../utils/suggestionEngine.js";

const router = express.Router();

router.use(protect);

function monthId(date) {
  const itemDate = new Date(date);
  return `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, "0")}`;
}

router.get("/", async (req, res, next) => {
  try {
    const exchangeRates = await getExchangeRates();
    const [transactions, futurePlans, budgets] = await Promise.all([
      Transaction.find({ user: req.user._id }),
      Goal.find({ user: req.user._id }),
      Budget.find({ user: req.user._id })
    ]);
    const expenses = transactions.filter((item) => item.type === "expense");
    const income = transactions.filter((item) => item.type === "income");
    const currentMonth = monthId(new Date());
    const currentMonthExpenses = expenses.filter((item) => monthId(item.date) === currentMonth);

    const nativeCategoryTotals = currentMonthExpenses.reduce((acc, item) => {
      const key = `${item.category}:${item.currency}`;
      acc[key] = (acc[key] || 0) + item.amount;
      return acc;
    }, {});

    const suggestions = generateSuggestions(expenses, income, futurePlans, exchangeRates);

    for (const budget of budgets) {
      const usedAmount = nativeCategoryTotals[`${budget.category}:${budget.currency}`] || 0;
      const usedPercent = budget.monthlyLimit > 0 ? Math.round((usedAmount / budget.monthlyLimit) * 100) : 0;

      if (usedPercent >= 80) {
        suggestions.push(`You already used ${usedPercent}% of your ${budget.category} budget this month.`);
      }
    }

    res.json({ suggestions });
  } catch (error) {
    next(error);
  }
});

export default router;
