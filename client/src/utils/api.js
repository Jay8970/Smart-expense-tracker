const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const AUTH_KEY = "smart-expense-auth";
export const currencyDetails = {
  CAD: {
    code: "CAD",
    label: "Canadian Dollar",
    shortLabel: "Dollar",
    locale: "en-CA"
  },
  INR: {
    code: "INR",
    label: "Indian Rupee",
    shortLabel: "Rupee",
    locale: "en-IN"
  }
};

export function getStoredAuth() {
  const rawAuth = localStorage.getItem(AUTH_KEY);
  return rawAuth ? JSON.parse(rawAuth) : null;
}

export function storeAuth(auth) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}

export function clearAuth() {
  localStorage.removeItem(AUTH_KEY);
}

async function request(path, options = {}) {
  const auth = getStoredAuth();
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || "Request failed");
  }

  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  register: (payload) => request("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload) => request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  getProfile: () => request("/auth/me"),
  updateProfile: (payload) => request("/auth/me", { method: "PUT", body: JSON.stringify(payload) }),
  updatePassword: (payload) => request("/auth/password", { method: "PUT", body: JSON.stringify(payload) }),
  forgotPassword: (payload) => request("/auth/forgot-password", { method: "POST", body: JSON.stringify(payload) }),
  resetPassword: (payload) => request("/auth/reset-password", { method: "POST", body: JSON.stringify(payload) }),
  getTransactions: () => request("/transactions"),
  createTransaction: (payload) =>
    request("/transactions", { method: "POST", body: JSON.stringify(payload) }),
  updateTransaction: (id, payload) =>
    request(`/transactions/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteTransaction: (id) => request(`/transactions/${id}`, { method: "DELETE" }),
  getGoals: () => request("/goals"),
  createGoal: (payload) => request("/goals", { method: "POST", body: JSON.stringify(payload) }),
  updateGoal: (id, payload) => request(`/goals/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteGoal: (id) => request(`/goals/${id}`, { method: "DELETE" }),
  getBudgets: () => request("/budgets"),
  createBudget: (payload) => request("/budgets", { method: "POST", body: JSON.stringify(payload) }),
  deleteBudget: (id) => request(`/budgets/${id}`, { method: "DELETE" }),
  getAnalytics: () => request("/analytics"),
  getSuggestions: () => request("/suggestions"),
  getExchangeRate: () => request("/exchange-rate"),
  importData: (payload) => request("/import", { method: "POST", body: JSON.stringify(payload) })
};

export function formatMoney(amount, currency = "CAD") {
  return new Intl.NumberFormat(currencyDetails[currency]?.locale || "en-CA", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0);
}

export function getCurrencyLabel(currency, variant = "label") {
  const details = currencyDetails[currency];
  if (!details) return currency;
  return variant === "short" ? details.shortLabel : details.label;
}

export function formatRateDate(dateValue) {
  if (!dateValue) return "unknown";
  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(dateValue));
}

export function convertFromBase(amount, targetCurrency, exchangeRate) {
  const numericAmount = Number(amount || 0);
  const base = exchangeRate?.base || "CAD";
  const rates = exchangeRate?.rates || { CAD: 1, INR: 60 };

  if (targetCurrency === base) {
    return numericAmount;
  }

  return Math.round((numericAmount * (Number(rates[targetCurrency]) || 1) + Number.EPSILON) * 100) / 100;
}
