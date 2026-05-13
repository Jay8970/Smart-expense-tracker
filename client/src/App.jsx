import { useEffect, useMemo, useRef, useState } from "react";
import AuthForm from "./components/AuthForm.jsx";
import BudgetAlerts from "./components/BudgetAlerts.jsx";
import DashboardCharts from "./components/DashboardCharts.jsx";
import GoalForm from "./components/GoalForm.jsx";
import GoalList from "./components/GoalList.jsx";
import IncomeForm from "./components/IncomeForm.jsx";
import ImportDataPanel from "./components/ImportDataPanel.jsx";
import LoadingSpinner from "./components/LoadingSpinner.jsx";
import MonthlyReport from "./components/MonthlyReport.jsx";
import NotFoundPage from "./components/NotFoundPage.jsx";
import ProfileSettings from "./components/ProfileSettings.jsx";
import PublicAbout from "./components/PublicAbout.jsx";
import PublicHome from "./components/PublicHome.jsx";
import RecentExpenses from "./components/RecentExpenses.jsx";
import Suggestions from "./components/Suggestions.jsx";
import SummaryCards from "./components/SummaryCards.jsx";
import TransactionForm from "./components/TransactionForm.jsx";
import TransactionList from "./components/TransactionList.jsx";
import Toast from "./components/Toast.jsx";
import WelcomeOverlay from "./components/WelcomeOverlay.jsx";
import { api, clearAuth, convertFromBase, formatMoney, getStoredAuth, storeAuth } from "./utils/api.js";

const dashboardDateFilters = [
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "this_year", label: "This year" },
  { key: "all_time", label: "All time" }
];
const reportMonthLabels = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

const emptyAnalytics = {
  summary: { incomeCad: 0, expenseCad: 0, balanceCad: 0 },
  summaryByCurrency: {
    CAD: { income: 0, expense: 0, balance: 0 },
    INR: { income: 0, expense: 0, balance: 0 }
  },
  dashboard: {
    totalIncome: { CAD: 0, INR: 0 },
    totalExpense: { CAD: 0, INR: 0 },
    remainingBalance: { CAD: 0, INR: 0 },
    futurePlanned: { CAD: 0, INR: 0 },
    monthlySpending: { CAD: 0, INR: 0 },
    topExpenseCategory: "No expenses yet",
    savingsGoalProgress: 0,
    budgetWarnings: [],
    budgetUsage: []
  },
  expensesByCategory: [],
  monthlyTrend: [],
  exchangeRate: null
};

const publicPages = ["Home", "Login / Register", "About"];
const privatePages = [
  "Dashboard",
  "Expense History",
  "Future Planning",
  "Reports",
  "Profile"
];
const addPages = ["Add Expense", "Add Income"];

function roundToTwo(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function toCad(amount, currency, exchangeRate) {
  if (currency === "CAD") return roundToTwo(amount);
  const inrRate = Number(exchangeRate?.rates?.INR || 60);
  return roundToTwo(Number(amount || 0) / inrRate);
}

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
  return { CAD: 0, INR: 0 };
}

function getRangeForKey(rangeKey, now = new Date()) {
  const today = new Date(now);
  today.setHours(23, 59, 59, 999);

  if (rangeKey === "this_month") {
    return {
      start: new Date(today.getFullYear(), today.getMonth(), 1),
      end: today
    };
  }

  if (rangeKey === "last_month") {
    return {
      start: new Date(today.getFullYear(), today.getMonth() - 1, 1),
      end: new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999)
    };
  }

  if (rangeKey === "this_year") {
    return {
      start: new Date(today.getFullYear(), 0, 1),
      end: today
    };
  }

  return null;
}

function getPreviousRange(rangeKey, now = new Date()) {
  const today = new Date(now);
  if (rangeKey === "this_month") {
    return {
      start: new Date(today.getFullYear(), today.getMonth() - 1, 1),
      end: new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999),
      label: "from last month"
    };
  }

  if (rangeKey === "last_month") {
    return {
      start: new Date(today.getFullYear(), today.getMonth() - 2, 1),
      end: new Date(today.getFullYear(), today.getMonth() - 1, 0, 23, 59, 59, 999),
      label: "from previous month"
    };
  }

  if (rangeKey === "this_year") {
    return {
      start: new Date(today.getFullYear() - 1, 0, 1),
      end: new Date(today.getFullYear() - 1, today.getMonth(), today.getDate(), 23, 59, 59, 999),
      label: "from last year"
    };
  }

  return null;
}

function isWithinRange(dateValue, range) {
  if (!range) return true;
  const itemDate = new Date(dateValue);
  return itemDate >= range.start && itemDate <= range.end;
}

function buildTrend(currentValue, previousValue, kind, comparisonLabel) {
  if (!comparisonLabel || previousValue <= 0) {
    return { text: "No previous data", tone: "neutral" };
  }

  const delta = roundToTwo(((currentValue - previousValue) / previousValue) * 100);
  const direction = delta >= 0 ? "up" : "down";
  const prefix = delta >= 0 ? "↑" : "↓";
  const tone =
    kind === "expense"
      ? delta >= 0 ? "negative" : "positive"
      : kind === "future"
        ? "neutral"
        : delta >= 0 ? "positive" : "negative";

  return {
    text: `${prefix} ${Math.abs(Math.round(delta))}% ${comparisonLabel}`,
    tone,
    direction
  };
}

function computeAnalyticsSnapshot({ transactions, goals, budgets, exchangeRate, rangeKey, customRange = null, customPreviousRange = null }) {
  const range = customRange || getRangeForKey(rangeKey);
  const previousRange = customPreviousRange || getPreviousRange(rangeKey);
  const filteredTransactions = transactions.filter((item) => isWithinRange(item.date, range));
  const filteredGoals = goals.filter((item) => isWithinRange(item.targetDate, range));
  const previousTransactions = previousRange
    ? transactions.filter((item) => isWithinRange(item.date, previousRange))
    : [];
  const previousGoals = previousRange
    ? goals.filter((item) => isWithinRange(item.targetDate, previousRange))
    : [];

  const summaryByCurrency = {
    CAD: { income: 0, expense: 0, balance: 0 },
    INR: { income: 0, expense: 0, balance: 0 }
  };
  const currentMonthCategorySpend = {};

  for (const item of filteredTransactions) {
    const bucket = summaryByCurrency[item.currency];
    if (!bucket) continue;
    if (item.type === "income") bucket.income += item.amount;
    if (item.type === "expense") bucket.expense += item.amount;
    bucket.balance = bucket.income - bucket.expense;
    if (item.type === "expense") {
      currentMonthCategorySpend[`${item.category}:${item.currency}`] =
        (currentMonthCategorySpend[`${item.category}:${item.currency}`] || 0) + item.amount;
    }
  }

  const summary = filteredTransactions.reduce(
    (acc, item) => {
      const amountCad = toCad(item.amount, item.currency, exchangeRate);
      if (item.type === "income") acc.incomeCad += amountCad;
      if (item.type === "expense") acc.expenseCad += amountCad;
      acc.balanceCad = acc.incomeCad - acc.expenseCad;
      return acc;
    },
    { incomeCad: 0, expenseCad: 0, balanceCad: 0 }
  );

  const previousSummary = previousTransactions.reduce(
    (acc, item) => {
      const amountCad = toCad(item.amount, item.currency, exchangeRate);
      if (item.type === "income") acc.incomeCad += amountCad;
      if (item.type === "expense") acc.expenseCad += amountCad;
      acc.balanceCad = acc.incomeCad - acc.expenseCad;
      return acc;
    },
    { incomeCad: 0, expenseCad: 0, balanceCad: 0 }
  );

  const expensesByCategory = Object.values(
    filteredTransactions
      .filter((item) => item.type === "expense")
      .reduce((acc, item) => {
        acc[item.category] ||= { category: item.category, amountCad: 0 };
        acc[item.category].amountCad += toCad(item.amount, item.currency, exchangeRate);
        return acc;
      }, {})
  )
    .map((item) => ({ ...item, amountCad: roundToTwo(item.amountCad) }))
    .sort((a, b) => b.amountCad - a.amountCad);

  const monthlyTrend = Object.values(
    filteredTransactions.reduce((acc, item) => {
      const key = monthKey(item.date);
      acc[key] ||= {
        month: key,
        monthSort: monthSortKey(item.date),
        incomeCad: 0,
        expenseCad: 0,
        expenseOriginal: 0
      };
      acc[key][item.type === "income" ? "incomeCad" : "expenseCad"] += toCad(item.amount, item.currency, exchangeRate);
      if (item.type === "expense") acc[key].expenseOriginal += item.amount;
      return acc;
    }, {})
  )
    .map((item) => ({
      ...item,
      incomeCad: roundToTwo(item.incomeCad),
      expenseCad: roundToTwo(item.expenseCad),
      expenseOriginal: roundToTwo(item.expenseOriginal)
    }))
    .sort((a, b) => a.monthSort.localeCompare(b.monthSort));

  const futurePlanned = filteredGoals.reduce(
    (acc, goal) => {
      acc[goal.currency] += goal.targetAmount;
      return acc;
    },
    emptyCurrencyTotals()
  );
  const previousFuturePlannedCad = previousGoals.reduce(
    (acc, goal) => acc + toCad(goal.targetAmount, goal.currency, exchangeRate),
    0
  );
  const currentFuturePlannedCad = filteredGoals.reduce(
    (acc, goal) => acc + toCad(goal.targetAmount, goal.currency, exchangeRate),
    0
  );

  const budgetUsage = budgets
    .map((budget) => {
      const usedAmount = currentMonthCategorySpend[`${budget.category}:${budget.currency}`] || 0;
      const usedPercent = budget.monthlyLimit > 0 ? Math.round((usedAmount / budget.monthlyLimit) * 100) : 0;
      return {
        id: budget._id,
        category: budget.category,
        currency: budget.currency,
        monthlyLimit: roundToTwo(budget.monthlyLimit),
        usedAmount: roundToTwo(usedAmount),
        usedPercent,
        message: `You already used ${usedPercent}% of your ${budget.category} budget this month.`
      };
    })
    .sort((a, b) => b.usedPercent - a.usedPercent);

  const dashboard = {
    totalIncome: {
      CAD: roundToTwo(summaryByCurrency.CAD.income),
      INR: roundToTwo(summaryByCurrency.INR.income)
    },
    totalExpense: {
      CAD: roundToTwo(summaryByCurrency.CAD.expense),
      INR: roundToTwo(summaryByCurrency.INR.expense)
    },
    remainingBalance: {
      CAD: roundToTwo(summaryByCurrency.CAD.balance),
      INR: roundToTwo(summaryByCurrency.INR.balance)
    },
    futurePlanned: {
      CAD: roundToTwo(futurePlanned.CAD),
      INR: roundToTwo(futurePlanned.INR)
    },
    monthlySpending: {
      CAD: roundToTwo(summaryByCurrency.CAD.expense),
      INR: roundToTwo(summaryByCurrency.INR.expense)
    },
    topExpenseCategory: expensesByCategory[0]?.category || "No expenses yet",
    savingsGoalProgress: 0,
    budgetWarnings: budgetUsage.filter((warning) => warning.usedPercent >= 80),
    budgetUsage
  };

  return {
    analytics: {
      summary: {
        incomeCad: roundToTwo(summary.incomeCad),
        expenseCad: roundToTwo(summary.expenseCad),
        balanceCad: roundToTwo(summary.balanceCad)
      },
      summaryByCurrency,
      dashboard,
      expensesByCategory,
      monthlyTrend,
      exchangeRate
    },
    filteredTransactions,
    filteredGoals,
    comparisonLabel: previousRange?.label || "",
    trends: {
      income: buildTrend(summary.incomeCad, previousSummary.incomeCad, "income", previousRange?.label),
      expense: buildTrend(summary.expenseCad, previousSummary.expenseCad, "expense", previousRange?.label),
      balance: buildTrend(summary.balanceCad, previousSummary.balanceCad, "balance", previousRange?.label),
      futureGoals: buildTrend(currentFuturePlannedCad, previousFuturePlannedCad, "future", previousRange?.label)
    }
  };
}

export default function App() {
  const storedAuth = getStoredAuth();
  const today = new Date();
  const [auth, setAuth] = useState(() => storedAuth);
  const [page, setPage] = useState(() => (storedAuth?.token ? "Dashboard" : "Home"));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [dashboardRange, setDashboardRange] = useState("this_month");
  const [reportMonth, setReportMonth] = useState(today.getMonth());
  const [reportYear, setReportYear] = useState(today.getFullYear());
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [analytics, setAnalytics] = useState(emptyAnalytics);
  const [exchangeRate, setExchangeRate] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editingGoal, setEditingGoal] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(storedAuth?.token));
  const [error, setError] = useState("");
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("smart-expense-theme") === "dark");
  const [showWelcome, setShowWelcome] = useState(false);
  const [toasts, setToasts] = useState([]);
  const toastTimersRef = useRef(new Map());
  const pendingTransactionDeletesRef = useRef(new Map());

  function closeToast(id) {
    const toastTimer = toastTimersRef.current.get(id);
    if (toastTimer?.timer) {
      window.clearTimeout(toastTimer.timer);
    }
    toastTimersRef.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  function showToast(message, type = "success", options = {}) {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const timer = window.setTimeout(() => {
      const meta = toastTimersRef.current.get(id);
      toastTimersRef.current.delete(id);
      setToasts((current) => current.filter((toast) => toast.id !== id));
      meta?.onExpire?.();
    }, options.duration ?? 3000);

    toastTimersRef.current.set(id, {
      timer,
      onAction: options.onAction,
      onExpire: options.onExpire
    });

    setToasts((current) => [
      ...current,
      {
        id,
        message,
        type,
        actionLabel: options.actionLabel || ""
      }
    ]);

    return id;
  }

  function runToastAction(id) {
    const meta = toastTimersRef.current.get(id);
    if (meta?.onAction) {
      meta.onAction();
    }
    closeToast(id);
  }

  useEffect(() => {
    return () => {
      for (const meta of toastTimersRef.current.values()) {
        if (meta?.timer) {
          window.clearTimeout(meta.timer);
        }
      }
      toastTimersRef.current.clear();

      for (const pending of pendingTransactionDeletesRef.current.values()) {
        if (pending?.timer) {
          window.clearTimeout(pending.timer);
        }
      }
      pendingTransactionDeletesRef.current.clear();
    };
  }, []);

  async function loadData() {
    if (!auth?.token) {
      setLoading(false);
      return;
    }

    setError("");
    try {
      const [transactionData, goalData, analyticsData, suggestionData, budgetData] = await Promise.all([
        api.getTransactions(),
        api.getGoals(),
        api.getAnalytics(),
        api.getSuggestions(),
        api.getBudgets()
      ]);
      setTransactions(transactionData);
      setGoals(goalData);
      setBudgets(budgetData);
      setAnalytics(analyticsData);
      setSuggestions(suggestionData.suggestions || []);
    } catch (err) {
      setError(err.message);
      showToast("❌ Something went wrong. Try again.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [auth?.token]);

  useEffect(() => {
    if (!auth?.token) {
      api.warmUp();
    }
  }, [auth?.token]);

  useEffect(() => {
    async function loadExchangeRate() {
      if (!auth?.token) {
        setExchangeRate(null);
        return;
      }

      try {
        const rateData = await api.getExchangeRate();
        setExchangeRate(rateData);
      } catch (_error) {
        setExchangeRate(null);
      }
    }

    loadExchangeRate();
  }, [auth?.token]);

  useEffect(() => {
    async function refreshProfile() {
      if (!auth?.token || auth.user) return;
      try {
        const profile = await api.getProfile();
        const refreshedAuth = { ...auth, user: profile.user };
        storeAuth(refreshedAuth);
        setAuth(refreshedAuth);
      } catch (_error) {
        clearAuth();
        setAuth(null);
        setPage("Home");
      }
    }

    refreshProfile();
  }, [auth?.token]);

  useEffect(() => {
    document.body.classList.toggle("dark-mode", darkMode);
    localStorage.setItem("smart-expense-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setAddMenuOpen(false);
  }, [page, auth?.token]);

  function handleAuth(nextAuth) {
    storeAuth(nextAuth);
    setAuth(nextAuth);
    setPage("Dashboard");
    setShowWelcome(true);
  }

  useEffect(() => {
    if (!showWelcome) return undefined;
    const timer = window.setTimeout(() => setShowWelcome(false), 2200);
    return () => window.clearTimeout(timer);
  }, [showWelcome]);

  function handleLogout() {
    for (const pending of pendingTransactionDeletesRef.current.values()) {
      if (pending?.timer) {
        window.clearTimeout(pending.timer);
      }
    }
    pendingTransactionDeletesRef.current.clear();
    clearAuth();
    setAuth(null);
    setTransactions([]);
    setGoals([]);
    setBudgets([]);
    setAnalytics(emptyAnalytics);
    setExchangeRate(null);
    setSuggestions([]);
    setEditingTransaction(null);
    setEditingGoal(null);
    setError("");
    setPage("Home");
    setLoading(false);
  }

  async function saveTransaction(payload) {
    try {
      if (editingTransaction) {
        await api.updateTransaction(editingTransaction._id, payload);
        setEditingTransaction(null);
        showToast(
          payload.type === "income" ? "✅ Income added successfully" : "✅ Expense added successfully",
          "success"
        );
      } else {
        await api.createTransaction(payload);
        showToast(
          payload.type === "income" ? "✅ Income added successfully" : "✅ Expense added successfully",
          "success"
        );
      }
      await loadData();
    } catch (_error) {
      showToast("❌ Something went wrong. Try again.", "error");
    }
  }

  async function deleteTransaction(id) {
    const transaction = transactions.find((item) => item._id === id);
    if (!transaction) return;

    setTransactions((current) => current.filter((item) => item._id !== id));

    const timer = window.setTimeout(async () => {
      pendingTransactionDeletesRef.current.delete(id);
      try {
        await api.deleteTransaction(id);
      } catch (_error) {
        showToast("❌ Something went wrong. Try again.", "error");
        await loadData();
      }
    }, 3000);

    pendingTransactionDeletesRef.current.set(id, { transaction, timer });
    showToast("🗑 Transaction deleted", "neutral", {
      actionLabel: "Undo",
      onAction: () => {
        const pendingDelete = pendingTransactionDeletesRef.current.get(id);
        if (pendingDelete?.timer) {
          window.clearTimeout(pendingDelete.timer);
        }
        pendingTransactionDeletesRef.current.delete(id);
        setTransactions((current) => [pendingDelete.transaction, ...current].sort(
          (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()
        ));
      }
    });
  }

  async function deleteTransactions(ids) {
    try {
      await Promise.all(ids.map((id) => api.deleteTransaction(id)));
      showToast(`🗑 ${ids.length} transaction${ids.length === 1 ? "" : "s"} deleted`, "neutral");
      await loadData();
    } catch (_error) {
      showToast("❌ Something went wrong. Try again.", "error");
    }
  }

  async function saveGoal(payload) {
    try {
      if (editingGoal) {
        await api.updateGoal(editingGoal._id, payload);
        setEditingGoal(null);
      } else {
        await api.createGoal(payload);
      }
      showToast("✅ Goal saved successfully", "success");
      await loadData();
    } catch (_error) {
      showToast("❌ Something went wrong. Try again.", "error");
    }
  }

  async function deleteGoal(id) {
    try {
      await api.deleteGoal(id);
      showToast("Goal deleted successfully.", "success");
      await loadData();
    } catch (_error) {
      showToast("❌ Something went wrong. Try again.", "error");
    }
  }

  async function saveBudget(payload) {
    try {
      await api.createBudget(payload);
      showToast("Budget saved successfully.", "success");
      await loadData();
    } catch (_error) {
      showToast("❌ Something went wrong. Try again.", "error");
    }
  }

  async function deleteBudget(id) {
    try {
      await api.deleteBudget(id);
      showToast("Budget deleted successfully.", "success");
      await loadData();
    } catch (_error) {
      showToast("❌ Something went wrong. Try again.", "error");
    }
  }

  async function loadDemoData() {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 12).toISOString().slice(0, 10);
    const date = today.toISOString().slice(0, 10);
    const futureDate = new Date(today.getFullYear(), today.getMonth() + 6, today.getDate()).toISOString().slice(0, 10);
    const demoTransactions = [
      { type: "income", title: "Monthly salary", amount: 2200, currency: "CAD", category: "Salary", date, isDemo: true },
      { type: "income", title: "Freelance project", amount: 18000, currency: "INR", category: "Freelance", date, isDemo: true },
      { type: "expense", title: "Rent payment", amount: 950, currency: "CAD", category: "Rent", date, paymentMethod: "Bank transfer", isDemo: true },
      { type: "expense", title: "Groceries", amount: 350, currency: "CAD", category: "Food", date, paymentMethod: "Debit card", isDemo: true },
      { type: "expense", title: "Weekend travel", amount: 6500, currency: "INR", category: "Travel", date, paymentMethod: "UPI", isDemo: true },
      { type: "expense", title: "Movie night", amount: 80, currency: "CAD", category: "Entertainment", date, paymentMethod: "Credit card", isDemo: true },
      { type: "expense", title: "Old travel bill", amount: 50, currency: "CAD", category: "Travel", date: lastMonth, paymentMethod: "Credit card", isDemo: true }
    ];
    const demoGoals = [
      { title: "Laptop purchase", category: "Electronics", targetAmount: 1200, savedAmount: 300, currency: "CAD", targetDate: futureDate, priority: "High", status: "Saving", isDemo: true },
      { title: "Travel plan", category: "Travel", targetAmount: 60000, savedAmount: 12000, currency: "INR", targetDate: futureDate, priority: "Medium", status: "Planning", isDemo: true }
    ];
    const demoBudgets = [
      { category: "Food", currency: "CAD", monthlyLimit: 400, isDemo: true },
      { category: "Travel", currency: "INR", monthlyLimit: 8000, isDemo: true }
    ];

    try {
      await Promise.all(demoTransactions.map((item) => api.createTransaction(item)));
      await Promise.all(demoGoals.map((item) => api.createGoal(item)));
      await Promise.all(demoBudgets.map((item) => api.createBudget(item)));
      showToast("Demo data loaded successfully.", "success");
      await loadData();
    } catch (_error) {
      showToast("❌ Something went wrong. Try again.", "error");
    }
  }

  async function removeDemoData() {
    const demoTransactionTitles = new Set([
      "Monthly salary",
      "Freelance project",
      "Rent payment",
      "Groceries",
      "Weekend travel",
      "Movie night",
      "Old travel bill"
    ]);
    const demoGoalTitles = new Set(["Laptop purchase", "Travel plan"]);
    const demoBudgetKeys = new Set(["Food:CAD:400", "Travel:INR:8000"]);
    const demoTransactions = transactions.filter(
      (item) => item.isDemo || demoTransactionTitles.has(item.title)
    );
    const demoGoals = goals.filter((goal) => goal.isDemo || demoGoalTitles.has(goal.title));
    const demoBudgets = budgets.filter(
      (budget) =>
        budget.isDemo || demoBudgetKeys.has(`${budget.category}:${budget.currency}:${budget.monthlyLimit}`)
    );

    try {
      await Promise.all(demoTransactions.map((item) => api.deleteTransaction(item._id)));
      await Promise.all(demoGoals.map((goal) => api.deleteGoal(goal._id)));
      await Promise.all(demoBudgets.map((budget) => api.deleteBudget(budget._id)));
      showToast("Sample data removed.", "success");
      await loadData();
    } catch (_error) {
      showToast("❌ Something went wrong. Try again.", "error");
    }
  }

  function exportCsv(rows = transactions) {
    const headers = ["Title", "Type", "Category", "Amount", "Currency", "Date", "Payment Method", "Recurring", "Note"];
    const csvRows = rows.map((item) =>
      [
        item.title,
        item.type,
        item.category,
        item.amount,
        item.currency,
        item.date.slice(0, 10),
        item.paymentMethod || "",
        item.recurring ? item.recurrenceFrequency : "",
        item.note || ""
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(",")
    );
    const csv = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "smart-expense-report.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const hasData = useMemo(() => transactions.length > 0 || goals.length > 0, [transactions, goals]);
  const expenseTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.type === "expense"),
    [transactions]
  );
  const dashboardSnapshot = useMemo(
    () => computeAnalyticsSnapshot({
      transactions,
      goals,
      budgets,
      exchangeRate,
      rangeKey: dashboardRange
    }),
    [transactions, goals, budgets, exchangeRate, dashboardRange]
  );
  const reportYears = useMemo(
    () => [today.getFullYear(), today.getFullYear() - 1, today.getFullYear() - 2, today.getFullYear() - 3],
    [today]
  );
  const reportRange = useMemo(
    () => ({
      start: new Date(reportYear, reportMonth, 1),
      end: new Date(reportYear, reportMonth + 1, 0, 23, 59, 59, 999)
    }),
    [reportMonth, reportYear]
  );
  const reportSnapshot = useMemo(
    () => computeAnalyticsSnapshot({
      transactions,
      goals,
      budgets,
      exchangeRate,
      rangeKey: "all_time",
      customRange: reportRange
    }),
    [transactions, goals, budgets, exchangeRate, reportRange]
  );
  const biggestExpense = useMemo(
    () =>
      reportSnapshot.filteredTransactions
        .filter((item) => item.type === "expense")
        .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))[0] || null,
    [reportSnapshot]
  );

  function renderPrivatePageTitle(title, subtitle, options = {}) {
    return (
      <section className="page-title-block">
        {options.showEyebrow !== false ? <p className="eyebrow">Smart Expense Tracker</p> : null}
        <h1>{title}</h1>
        {subtitle && <p className="page-title-copy">{subtitle}</p>}
      </section>
    );
  }

  function renderPublicPage() {
    if (page === "Login / Register") {
      return (
        <AuthForm
          api={api}
          initialMode="login"
          onAuth={handleAuth}
        />
      );
    }

    if (page === "About") {
      return <PublicAbout />;
    }

    if (page === "Home") {
      return <PublicHome onNavigate={setPage} />;
    }

    return <NotFoundPage onBack={() => setPage("Home")} />;
  }

  function renderPrivatePage() {
    if (error) {
      return (
        <section className="notice">
          <strong>Action needed.</strong> {error}
        </section>
      );
    }

    if (page === "Add Expense") {
      return (
        <>
          {renderPrivatePageTitle("Add Expense", "Record a new expense and keep your spending up to date.")}
          <TransactionForm
            editingTransaction={editingTransaction?.type === "expense" ? editingTransaction : null}
            onCancel={() => setEditingTransaction(null)}
            onSubmit={saveTransaction}
            transactions={transactions}
          />
        </>
      );
    }

    if (page === "Expense History") {
      return (
        <>
          {renderPrivatePageTitle("Expense History", "Review, filter, and export your saved transactions.")}
          <TransactionList
            loading={loading}
            transactions={expenseTransactions}
            onEdit={(transaction) => {
              setEditingTransaction(transaction);
              setPage("Add Expense");
            }}
            onBulkDelete={deleteTransactions}
            onDelete={deleteTransaction}
            onExportCsv={exportCsv}
          />
        </>
      );
    }

    if (page === "Add Income") {
      return (
        <>
          {renderPrivatePageTitle("Add Income", "Log salary, freelance work, and other money coming in.")}
          <IncomeForm
            editingIncome={editingTransaction?.type === "income" ? editingTransaction : null}
            onCancel={() => setEditingTransaction(null)}
            onSubmit={saveTransaction}
          />
        </>
      );
    }

    if (page === "Future Planning") {
      if (loading) {
        return (
          <>
            {renderPrivatePageTitle("Future Planning", "Set savings targets and keep upcoming expenses in view.")}
            <section className="panel">
              <LoadingSpinner label="Loading future plans..." fullHeight />
            </section>
          </>
        );
      }

      return (
        <>
          {renderPrivatePageTitle("Future Planning", "Set savings targets and keep upcoming expenses in view.")}
          <section className="workspace-grid">
            <GoalForm editingGoal={editingGoal} onCancel={() => setEditingGoal(null)} onSubmit={saveGoal} />
            <GoalList
              displayCurrency={auth?.user?.defaultCurrency || "CAD"}
              exchangeRate={exchangeRate}
              goals={goals}
              onEdit={setEditingGoal}
              onDelete={deleteGoal}
            />
          </section>
        </>
      );
    }

    if (page === "Reports") {
      if (loading) {
        return (
          <>
            {renderPrivatePageTitle("Reports", "Export data, import spreadsheets, and review your charts.")}
            <section className="panel">
              <LoadingSpinner label="Loading reports..." fullHeight />
            </section>
          </>
        );
      }

      return (
        <>
          {renderPrivatePageTitle("Reports", "Export data, import spreadsheets, and review your charts.")}
          <section className="panel report-actions">
            <div className="section-heading">
              <p>Reports / Analytics</p>
              <h2>Export report</h2>
            </div>
            <div className="actions">
              <button type="button" onClick={() => exportCsv(transactions)}>Export CSV</button>
              <button className="ghost" type="button" onClick={() => window.print()}>Print / Save PDF</button>
            </div>
          </section>
          <section className="panel report-filters-panel">
            <div className="report-filter-row">
              <label>
                Month
                <select value={reportMonth} onChange={(event) => setReportMonth(Number(event.target.value))}>
                  {reportMonthLabels.map((month, index) => (
                    <option key={month} value={index}>{month}</option>
                  ))}
                </select>
              </label>
              <label>
                Year
                <select value={reportYear} onChange={(event) => setReportYear(Number(event.target.value))}>
                  {reportYears.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </label>
              <button
                className="link-button report-reset-link"
                type="button"
                onClick={() => {
                  setReportMonth(today.getMonth());
                  setReportYear(today.getFullYear());
                }}
              >
                Reset to current month
              </button>
            </div>
          </section>
          <section className="report-callouts">
            <article className="panel report-callout-card">
              <strong>💸 Biggest expense: {biggestExpense ? `${biggestExpense.title} — ${formatMoney(biggestExpense.amount, biggestExpense.currency)}` : "No expenses yet"}</strong>
              <span>
                {biggestExpense
                  ? `${biggestExpense.category} · ${new Date(biggestExpense.date).toLocaleDateString()}`
                  : "Add expenses in the selected month to see the biggest purchase."}
              </span>
            </article>
            <article className="panel report-callout-card">
              <strong>
                Most spent category: {reportSnapshot.analytics.expensesByCategory[0]
                  ? `${reportSnapshot.analytics.expensesByCategory[0].category} — ${formatMoney(
                    convertFromBase(
                      reportSnapshot.analytics.expensesByCategory[0].amountCad,
                      auth?.user?.defaultCurrency || "CAD",
                      exchangeRate
                    ),
                    auth?.user?.defaultCurrency || "CAD"
                  )}`
                  : "No category data"}
              </strong>
              <span>
                {reportSnapshot.analytics.expensesByCategory[0]
                  ? `Based on ${reportMonthLabels[reportMonth]} ${reportYear}`
                  : "Add expenses in the selected month to compare categories."}
              </span>
            </article>
          </section>
          <ImportDataPanel api={api} onImported={loadData} onToast={showToast} />
          <DashboardCharts
            analytics={reportSnapshot.analytics}
            displayCurrency={auth?.user?.defaultCurrency || "CAD"}
            exchangeRate={exchangeRate}
            loading={loading}
          />
        </>
      );
    }

    if (page === "Profile") {
      if (loading) {
        return (
          <>
            {renderPrivatePageTitle("Profile", "Manage your account, preferences, savings goal, and budgets.", { showEyebrow: false })}
            <section className="panel">
              <LoadingSpinner label="Loading your profile..." fullHeight />
            </section>
          </>
        );
      }

      return (
        <>
          {renderPrivatePageTitle("Profile", "Manage your account, preferences, savings goal, and budgets.", { showEyebrow: false })}
          <ProfileSettings
            analytics={analytics}
            api={api}
            auth={auth}
            budgets={budgets}
            budgetUsage={analytics.dashboard?.budgetUsage || []}
            darkMode={darkMode}
            exchangeRate={exchangeRate}
            goals={goals}
            onCreateBudget={saveBudget}
            onDeleteBudget={deleteBudget}
            onToggleDarkMode={() => setDarkMode((current) => !current)}
            onUpdateAuth={setAuth}
            transactions={transactions}
          />
        </>
      );
    }

    if (page !== "Dashboard") {
      return <NotFoundPage isAuthed onBack={() => setPage("Dashboard")} />;
    }

    return (
      <>
        {renderPrivatePageTitle("Dashboard", "See your latest totals, charts, activity, and suggestions in one place.")}
        <section className="dashboard-filter-bar">
          {dashboardDateFilters.map((filter) => (
            <button
              className={dashboardRange === filter.key ? "dashboard-filter-active" : "dashboard-filter-button"}
              key={filter.key}
              type="button"
              onClick={() => setDashboardRange(filter.key)}
            >
              {filter.label}
            </button>
          ))}
        </section>
        {loading ? (
          <>
            <section className="dashboard-section dashboard-group">
              <SummaryCards goalCount={0} loading summary={emptyAnalytics} trends={{}} />
            </section>
            <section className="dashboard-section dashboard-group">
              <DashboardCharts
                analytics={emptyAnalytics}
                displayCurrency={auth?.user?.defaultCurrency || "CAD"}
                exchangeRate={exchangeRate}
                loading
                variant="dashboard"
              />
            </section>
          </>
        ) : transactions.length === 0 ? (
          <section className="panel dashboard-empty-state">
            <div>
              <h2>👋 Welcome, {auth?.user?.name || "there"}! Let&apos;s get started.</h2>
              <p>Add your first expense or import your existing data to get started.</p>
            </div>
            <div className="actions">
              <button type="button" onClick={() => setPage("Add Expense")}>+ Add Expense</button>
              <button className="ghost" type="button" onClick={() => setPage("Reports")}>Import CSV</button>
            </div>
          </section>
        ) : (
          <>
            <section className="dashboard-section dashboard-group">
              <SummaryCards
                goalCount={dashboardSnapshot.filteredGoals.length}
                summary={dashboardSnapshot.analytics}
                trends={dashboardSnapshot.trends}
              />
            </section>
        <section className="panel demo-panel">
          <div>
            <p className="eyebrow">Demo helper</p>
            <h2>Need charts fast?</h2>
          </div>
          <div className="actions">
            <button type="button" onClick={loadDemoData}>Load sample data</button>
            <button className="ghost" type="button" onClick={removeDemoData}>Remove sample data</button>
          </div>
        </section>
        <ImportDataPanel api={api} onImported={loadData} onToast={showToast} />
        <BudgetAlerts warnings={analytics.dashboard?.budgetWarnings || []} />

        {!hasData && (
          <section className="notice">
            Add your first income, expense, or future goal to bring the dashboard to life.
          </section>
        )}

        <section className="dashboard-section dashboard-group">
          <div className="dashboard-group-heading">
            <p className="eyebrow">Charts</p>
            <h2>Spending and trend visuals</h2>
          </div>
          <DashboardCharts
            analytics={dashboardSnapshot.analytics}
            displayCurrency={auth?.user?.defaultCurrency || "CAD"}
            exchangeRate={exchangeRate}
            loading={loading}
            variant="dashboard"
          />
        </section>

        <section className="dashboard-group dashboard-recent">
          <div className="dashboard-group-heading">
            <p className="eyebrow">Recent transactions</p>
            <h2>Latest activity</h2>
          </div>
          <RecentExpenses expenses={dashboardSnapshot.filteredTransactions.filter((item) => item.type === "expense")} onViewAll={() => setPage("Expense History")} />
        </section>

        <section className="dashboard-bottom dashboard-group">
          <div className="stack">
            <div className="dashboard-group-heading">
              <p className="eyebrow">Suggestions</p>
              <h2>Helpful next steps</h2>
            </div>
            <Suggestions suggestions={suggestions} />
            <MonthlyReport analytics={dashboardSnapshot.analytics} exchangeRate={exchangeRate} />
          </div>
          <GoalList
            displayCurrency={auth?.user?.defaultCurrency || "CAD"}
            exchangeRate={exchangeRate}
            goals={dashboardSnapshot.filteredGoals}
            onEdit={(goal) => {
              setEditingGoal(goal);
              setPage("Future Planning");
            }}
            onDelete={deleteGoal}
          />
        </section>
          </>
        )}
      </>
    );
  }

  return (
    <main className="app-shell">
      <nav className="top-nav">
        <strong className="brand-mark">
          <span className="brand-symbol" aria-hidden="true">₹$</span>
          <span className="brand-text">
            <span>Smart Expense</span>
            <span>Tracker</span>
          </span>
        </strong>
        <div className="nav-actions">
          {auth?.token ? (
            <div className="nav-profile-area">
              <button
                className={page === "Profile" ? "nav-active nav-profile-button" : "ghost nav-profile-button"}
                type="button"
                onClick={() => setPage("Profile")}
              >
                Profile
              </button>
              <button className="ghost nav-logout-button" type="button" onClick={handleLogout}>
                Logout
              </button>
            </div>
          ) : null}
          <button
            aria-expanded={mobileMenuOpen}
            aria-label="Open navigation menu"
            className="mobile-menu-toggle"
            type="button"
            onClick={() => setMobileMenuOpen((current) => !current)}
          >
            <span />
            <span />
            <span />
          </button>
          <div className={`nav-links ${mobileMenuOpen ? "nav-links-open" : ""}`}>
            {!auth?.token ? (
              publicPages.map((item) => (
                <button
                  className={page === item ? "nav-active" : "ghost"}
                  key={item}
                  type="button"
                  onClick={() => setPage(item)}
                >
                  {item}
                </button>
              ))
            ) : (
              <>
                <button
                  className={page === "Dashboard" ? "nav-active" : "ghost"}
                  type="button"
                  onClick={() => setPage("Dashboard")}
                >
                  Dashboard
                </button>
                <div className="nav-dropdown">
                  <button
                    aria-expanded={addMenuOpen}
                    className={addPages.includes(page) ? "nav-active" : "ghost"}
                    type="button"
                    onClick={() => setAddMenuOpen((current) => !current)}
                  >
                    + Add
                  </button>
                  <div className={`nav-dropdown-menu ${addMenuOpen ? "nav-dropdown-menu-open" : ""}`}>
                    {addPages.map((item) => (
                      <button
                        className={page === item ? "nav-active" : "ghost"}
                        key={item}
                        type="button"
                        onClick={() => setPage(item)}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
                {privatePages.filter((item) => item !== "Dashboard").map((item) => (
                  <button
                    className={page === item ? "nav-active" : "ghost"}
                    key={item}
                    type="button"
                    onClick={() => setPage(item)}
                  >
                    {item}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      </nav>

      {!auth?.token && page !== "Home" && (
        <header className="app-header">
          <div>
            <p className="eyebrow">INR + CAD personal finance</p>
            <h1>Smart Expense Tracker</h1>
            <p className="lede">
              Track money, plan goals, and spot better saving choices before the month gets away.
            </p>
          </div>
        </header>
      )}

      {auth?.token ? renderPrivatePage() : renderPublicPage()}
      <footer className="app-footer">
        <p>© 2026 Smart Expense Tracker. All rights reserved. Your financial data stays private and protected.</p>
      </footer>
      <Toast toasts={toasts} onAction={runToastAction} onClose={closeToast} />
      {showWelcome && <WelcomeOverlay user={auth?.user} />}
    </main>
  );
}
