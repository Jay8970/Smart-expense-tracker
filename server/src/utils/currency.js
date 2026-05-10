const FALLBACK_RATES = {
  base: "CAD",
  rates: {
    CAD: 1,
    INR: 60
  },
  fetchedAt: null,
  source: "fallback"
};

const RATE_CACHE_MS = 6 * 60 * 60 * 1000;
let cachedRates = {
  ...FALLBACK_RATES,
  cacheExpiresAt: 0
};

export async function getExchangeRates() {
  if (cachedRates.cacheExpiresAt > Date.now()) {
    return cachedRates;
  }

  try {
    const response = await fetch("https://api.frankfurter.dev/v1/latest?base=CAD&symbols=INR");
    if (!response.ok) {
      throw new Error(`Rate request failed with ${response.status}`);
    }

    const payload = await response.json();
    const inrRate = Number(payload?.rates?.INR);

    if (!Number.isFinite(inrRate) || inrRate <= 0) {
      throw new Error("Invalid INR rate received");
    }

    cachedRates = {
      base: "CAD",
      rates: {
        CAD: 1,
        INR: inrRate
      },
      fetchedAt: payload?.date || new Date().toISOString().slice(0, 10),
      source: "frankfurter",
      cacheExpiresAt: Date.now() + RATE_CACHE_MS
    };
  } catch (_error) {
    cachedRates = {
      ...cachedRates,
      cacheExpiresAt: Date.now() + 15 * 60 * 1000
    };
  }

  return cachedRates;
}

export function toCad(amount, currency, exchangeRates = FALLBACK_RATES) {
  const numericAmount = Number(amount || 0);
  if (currency === "CAD") return numericAmount;

  const inrPerCad = Number(exchangeRates?.rates?.INR) || FALLBACK_RATES.rates.INR;
  if (currency === "INR") return numericAmount / inrPerCad;

  return numericAmount;
}

export function formatMoney(amount, currency = "CAD") {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(amount || 0);
}
