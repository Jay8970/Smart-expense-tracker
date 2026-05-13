import express from "express";
import { protect } from "../middleware/auth.js";
import { Budget } from "../models/Budget.js";
import { Goal } from "../models/Goal.js";
import { Transaction } from "../models/Transaction.js";
import { clearReportCacheForUser } from "../utils/reportCache.js";

const router = express.Router();

router.use(protect);

const transactionTypes = new Set(["income", "expense"]);
const currencies = new Set(["CAD", "INR"]);
const recurrenceFrequencies = new Set(["None", "Weekly", "Monthly", "Yearly"]);
const goalPriorities = new Set(["Low", "Medium", "High"]);
const goalStatuses = new Set(["Planning", "Saving", "Completed"]);

function toNumber(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} must be a valid number.`);
  }
  return parsed;
}

function normalizeBoolean(value) {
  if (typeof value === "boolean") return value;
  const normalized = String(value || "").trim().toLowerCase();
  return ["true", "yes", "y", "1"].includes(normalized);
}

function normalizeDate(value, fieldName) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldName} must be a valid date.`);
  }
  return parsed;
}

function normalizeCurrency(value) {
  const normalized = String(value || "").trim().toUpperCase();
  if (!currencies.has(normalized)) {
    throw new Error("Currency must be CAD or INR.");
  }
  return normalized;
}

function normalizeTransaction(row) {
  const type = String(row.type || "").trim().toLowerCase();
  if (!transactionTypes.has(type)) {
    throw new Error("Transaction type must be income or expense.");
  }

  const recurrenceFrequency = row.recurrenceFrequency
    ? String(row.recurrenceFrequency).trim()
    : "None";

  if (!recurrenceFrequencies.has(recurrenceFrequency)) {
    throw new Error("Recurrence frequency must be None, Weekly, Monthly, or Yearly.");
  }

  return {
    type,
    title: String(row.title || "").trim(),
    category: String(row.category || "").trim(),
    amount: toNumber(row.amount, "Transaction amount"),
    currency: normalizeCurrency(row.currency),
    date: normalizeDate(row.date || new Date(), "Transaction date"),
    paymentMethod: String(row.paymentMethod || "Cash").trim(),
    recurring: normalizeBoolean(row.recurring),
    recurrenceFrequency,
    note: String(row.note || "").trim()
  };
}

function normalizeGoal(row) {
  const priority = row.priority ? String(row.priority).trim() : "Medium";
  const status = row.status ? String(row.status).trim() : "Planning";

  if (!goalPriorities.has(priority)) {
    throw new Error("Goal priority must be Low, Medium, or High.");
  }

  if (!goalStatuses.has(status)) {
    throw new Error("Goal status must be Planning, Saving, or Completed.");
  }

  return {
    title: String(row.title || "").trim(),
    category: String(row.category || "Future plan").trim(),
    targetAmount: toNumber(row.targetAmount, "Goal target amount"),
    savedAmount: row.savedAmount === undefined || row.savedAmount === "" ? 0 : toNumber(row.savedAmount, "Goal saved amount"),
    currency: normalizeCurrency(row.currency),
    targetDate: normalizeDate(row.targetDate, "Goal target date"),
    priority,
    status
  };
}

function normalizeBudget(row) {
  return {
    category: String(row.category || "").trim(),
    currency: normalizeCurrency(row.currency),
    monthlyLimit: toNumber(row.monthlyLimit, "Budget monthly limit")
  };
}

function ensureRequiredText(value, fieldName) {
  if (!value || !String(value).trim()) {
    throw new Error(`${fieldName} is required.`);
  }
}

router.post("/", async (req, res, next) => {
  try {
    const transactionsInput = Array.isArray(req.body.transactions) ? req.body.transactions : [];
    const goalsInput = Array.isArray(req.body.goals) ? req.body.goals : [];
    const budgetsInput = Array.isArray(req.body.budgets) ? req.body.budgets : [];

    if (transactionsInput.length === 0 && goalsInput.length === 0 && budgetsInput.length === 0) {
      return res.status(400).json({ message: "No import rows were provided." });
    }

    const transactions = transactionsInput.map((row, index) => {
      const normalized = normalizeTransaction(row);
      ensureRequiredText(normalized.title, `Transaction title in row ${index + 1}`);
      ensureRequiredText(normalized.category, `Transaction category in row ${index + 1}`);
      return { ...normalized, user: req.user._id };
    });

    const goals = goalsInput.map((row, index) => {
      const normalized = normalizeGoal(row);
      ensureRequiredText(normalized.title, `Goal title in row ${index + 1}`);
      return { ...normalized, user: req.user._id };
    });

    const budgets = budgetsInput.map((row, index) => {
      const normalized = normalizeBudget(row);
      ensureRequiredText(normalized.category, `Budget category in row ${index + 1}`);
      return { ...normalized, user: req.user._id };
    });

    if (transactions.some((item) => item.amount <= 0)) {
      return res.status(400).json({ message: "Transaction amounts must be greater than 0." });
    }

    if (goals.some((item) => item.targetAmount <= 0 || item.savedAmount < 0 || item.savedAmount > item.targetAmount)) {
      return res.status(400).json({ message: "Goal amounts are invalid. Saved amount cannot exceed target amount." });
    }

    if (budgets.some((item) => item.monthlyLimit <= 0)) {
      return res.status(400).json({ message: "Budget limits must be greater than 0." });
    }

    await Promise.all([
      transactions.length ? Transaction.insertMany(transactions, { ordered: false }) : Promise.resolve(),
      goals.length ? Goal.insertMany(goals, { ordered: false }) : Promise.resolve(),
      budgets.length
        ? Budget.bulkWrite(
            budgets.map((budget) => ({
              updateOne: {
                filter: { user: req.user._id, category: budget.category, currency: budget.currency },
                update: { $set: budget },
                upsert: true
              }
            }))
          )
        : Promise.resolve()
    ]);

    clearReportCacheForUser(req.user._id);

    res.status(201).json({
      message: "Data imported successfully.",
      counts: {
        transactions: transactions.length,
        goals: goals.length,
        budgets: budgets.length
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
