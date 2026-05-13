const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const AUTH_KEY = "smart-expense-auth";
const TOKEN_KEY = "token";
const PROFILE_KEY = "userProfile";
let warmUpPromise = null;
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

function parseJwtPayload(token) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    return JSON.parse(window.atob(padded));
  } catch (_error) {
    return null;
  }
}

export function isTokenExpired(token) {
  if (!token) return true;
  const payload = parseJwtPayload(token);
  if (!payload?.exp) {
    return false;
  }

  return payload.exp * 1000 <= Date.now();
}

export function getStoredAuth() {
  const rawAuth = localStorage.getItem(AUTH_KEY);
  const rawToken = localStorage.getItem(TOKEN_KEY);
  const rawProfile = localStorage.getItem(PROFILE_KEY);

  if (rawAuth) {
    try {
      const parsedAuth = JSON.parse(rawAuth);
      if (parsedAuth?.token && !isTokenExpired(parsedAuth.token)) {
        return parsedAuth;
      }
    } catch (_error) {
      // Fall through to token/profile recovery below.
    }
  }

  if (rawToken && !isTokenExpired(rawToken)) {
    try {
      const parsedProfile = rawProfile ? JSON.parse(rawProfile) : null;
      const recoveredAuth = {
        token: rawToken,
        user: parsedProfile
      };
      localStorage.setItem(AUTH_KEY, JSON.stringify(recoveredAuth));
      return recoveredAuth;
    } catch (_error) {
      const recoveredAuth = { token: rawToken, user: null };
      localStorage.setItem(AUTH_KEY, JSON.stringify(recoveredAuth));
      return recoveredAuth;
    }
  }

  clearAuth();
  return null;
}

export function storeAuth(auth) {
  if (auth?.token) {
    localStorage.setItem(TOKEN_KEY, auth.token);
  }
  if (auth?.user) {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(auth.user));
  }
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}

export function clearAuth() {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PROFILE_KEY);
}

async function request(path, options = {}) {
  const auth = getStoredAuth();
  const response = await fetch(`${API_URL}${path}`, {
    keepalive: true,
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

export function warmUpApi() {
  if (!warmUpPromise) {
    warmUpPromise = fetch(`${API_URL}/health`, { method: "GET", keepalive: true }).catch(() => null);
  }

  return warmUpPromise;
}

export const api = {
  warmUp: () => warmUpApi(),
  register: (payload) => request("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload) => request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  getProfile: () => request("/auth/me"),
  updateProfile: (payload) => request("/auth/me", { method: "PUT", body: JSON.stringify(payload) }),
  updatePassword: (payload) => request("/auth/password", { method: "PUT", body: JSON.stringify(payload) }),
  deleteAccount: () => request("/auth/me", { method: "DELETE" }),
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
  getReportCharts: (month, year) => request(`/reports/charts?month=${month}&year=${year}`),
  getReportSummary: (month, year, currency) =>
    request(`/reports/summary?month=${month}&year=${year}&currency=${currency}`),
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
