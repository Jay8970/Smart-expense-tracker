import { useEffect, useMemo, useState } from "react";
import AuthForm from "./components/AuthForm.jsx";
import BudgetAlerts from "./components/BudgetAlerts.jsx";
import DashboardCharts from "./components/DashboardCharts.jsx";
import GoalForm from "./components/GoalForm.jsx";
import GoalList from "./components/GoalList.jsx";
import IncomeForm from "./components/IncomeForm.jsx";
import ImportDataPanel from "./components/ImportDataPanel.jsx";
import MonthlyReport from "./components/MonthlyReport.jsx";
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
import { api, clearAuth, getStoredAuth, storeAuth } from "./utils/api.js";

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
  "Add Expense",
  "Expense History",
  "Add Income",
  "Future Planning",
  "Reports",
  "Profile"
];

export default function App() {
  const storedAuth = getStoredAuth();
  const [auth, setAuth] = useState(() => storedAuth);
  const [page, setPage] = useState(() => (storedAuth?.token ? "Dashboard" : "Home"));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
  const [toast, setToast] = useState(null);

  function showToast(message, type = "success") {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3200);
  }

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
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
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
    if (editingTransaction) {
      await api.updateTransaction(editingTransaction._id, payload);
      setEditingTransaction(null);
      showToast("Record updated successfully.");
    } else {
      await api.createTransaction(payload);
      showToast(payload.type === "income" ? "Income added successfully." : "Expense added successfully.");
    }
    await loadData();
  }

  async function deleteTransaction(id) {
    await api.deleteTransaction(id);
    showToast("Expense deleted successfully.");
    await loadData();
  }

  async function saveGoal(payload) {
    if (editingGoal) {
      await api.updateGoal(editingGoal._id, payload);
      setEditingGoal(null);
      showToast("Future plan updated successfully.");
    } else {
      await api.createGoal(payload);
      showToast("Future plan added successfully.");
    }
    await loadData();
  }

  async function deleteGoal(id) {
    await api.deleteGoal(id);
    showToast("Future plan deleted successfully.");
    await loadData();
  }

  async function saveBudget(payload) {
    await api.createBudget(payload);
    showToast("Budget saved successfully.");
    await loadData();
  }

  async function deleteBudget(id) {
    await api.deleteBudget(id);
    showToast("Budget deleted successfully.");
    await loadData();
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

    await Promise.all(demoTransactions.map((item) => api.createTransaction(item)));
    await Promise.all(demoGoals.map((item) => api.createGoal(item)));
    await Promise.all(demoBudgets.map((item) => api.createBudget(item)));
    showToast("Demo data loaded successfully.");
    await loadData();
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

    await Promise.all(demoTransactions.map((item) => api.deleteTransaction(item._id)));
    await Promise.all(demoGoals.map((goal) => api.deleteGoal(goal._id)));
    await Promise.all(demoBudgets.map((budget) => api.deleteBudget(budget._id)));
    showToast("Sample data removed.");
    await loadData();
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

    return <PublicHome onNavigate={setPage} />;
  }

  function renderPrivatePage() {
    if (error) {
      return (
        <section className="notice">
          <strong>Action needed.</strong> {error}
        </section>
      );
    }

    if (loading) {
      return <section className="loading">Loading your finance dashboard...</section>;
    }

    if (page === "Add Expense") {
      return (
        <TransactionForm
          editingTransaction={editingTransaction?.type === "expense" ? editingTransaction : null}
          onCancel={() => setEditingTransaction(null)}
          onSubmit={saveTransaction}
        />
      );
    }

    if (page === "Expense History") {
      return (
        <TransactionList
          transactions={expenseTransactions}
          onEdit={(transaction) => {
            setEditingTransaction(transaction);
            setPage("Add Expense");
          }}
          onDelete={deleteTransaction}
          onExportCsv={exportCsv}
        />
      );
    }

    if (page === "Add Income") {
      return (
        <IncomeForm
          editingIncome={editingTransaction?.type === "income" ? editingTransaction : null}
          onCancel={() => setEditingTransaction(null)}
          onSubmit={saveTransaction}
        />
      );
    }

    if (page === "Future Planning") {
      return (
        <section className="workspace-grid">
          <GoalForm editingGoal={editingGoal} onCancel={() => setEditingGoal(null)} onSubmit={saveGoal} />
          <GoalList goals={goals} onEdit={setEditingGoal} onDelete={deleteGoal} />
        </section>
      );
    }

    if (page === "Reports") {
      return (
        <>
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
          <ImportDataPanel api={api} onImported={loadData} onToast={showToast} />
          <DashboardCharts
            analytics={analytics}
            displayCurrency={auth?.user?.defaultCurrency || "CAD"}
            exchangeRate={exchangeRate}
          />
        </>
      );
    }

    if (page === "Profile") {
      return (
        <ProfileSettings
          analytics={analytics}
          api={api}
          auth={auth}
          budgets={budgets}
          budgetUsage={analytics.dashboard?.budgetUsage || []}
          darkMode={darkMode}
          onCreateBudget={saveBudget}
          onDeleteBudget={deleteBudget}
          onLogout={handleLogout}
          onToggleDarkMode={() => setDarkMode((current) => !current)}
          onUpdateAuth={setAuth}
        />
      );
    }

    return (
      <>
        <section className="dashboard-section">
          <SummaryCards summary={analytics} transactionCount={transactions.length} goalCount={goals.length} />
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

        <section className="dashboard-section">
          <DashboardCharts
            analytics={analytics}
            displayCurrency={auth?.user?.defaultCurrency || "CAD"}
            exchangeRate={exchangeRate}
            variant="dashboard"
          />
        </section>

        <section className="dashboard-bottom">
          <RecentExpenses expenses={expenseTransactions} onViewAll={() => setPage("Expense History")} />
          <div className="stack">
            <MonthlyReport analytics={analytics} exchangeRate={exchangeRate} />
            <Suggestions suggestions={suggestions} />
          </div>
          <GoalList goals={goals} onEdit={(goal) => {
            setEditingGoal(goal);
            setPage("Future Planning");
          }} onDelete={deleteGoal} />
        </section>
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
            {(auth?.token ? privatePages : publicPages).map((item) => (
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
      </nav>

      <header className="app-header">
        <div>
          <p className="eyebrow">INR + CAD personal finance</p>
          <h1>Smart Expense Tracker</h1>
          <p className="lede">
            Track money, plan goals, and spot better saving choices before the month gets away.
          </p>
        </div>
        {auth?.user && (
          <div className="user-menu">
            <button className="profile-shortcut" type="button" onClick={() => setPage("Profile")}>
              {auth.user.profilePicture ? (
                <img className="header-avatar" src={auth.user.profilePicture} alt="" />
              ) : (
                <span className="header-avatar placeholder">
                  {auth.user.name?.slice(0, 1).toUpperCase() || "U"}
                </span>
              )}
              <span>{auth.user.name}</span>
            </button>
            <button className="ghost" type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        )}
      </header>

      {auth?.token ? renderPrivatePage() : renderPublicPage()}
      <footer className="app-footer">
        <p>© 2026 Smart Expense Tracker. All rights reserved. Your financial data stays private and protected.</p>
      </footer>
      <Toast toast={toast} onClose={() => setToast(null)} />
      {showWelcome && <WelcomeOverlay user={auth?.user} />}
    </main>
  );
}
