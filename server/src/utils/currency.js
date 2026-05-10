import { ExchangeRate } from "../models/ExchangeRate.js";

const DEFAULT_BASE = "CAD";
const DEFAULT_QUOTES = ["INR"];
const FALLBACK_RATES = {
  base: DEFAULT_BASE,
  rates: {
    CAD: 1,
    INR: 60
  },
  fetchedAt: null,
  source: "fallback",
  stale: true,
  fallbackReason: "Live exchange rates are unavailable, so the saved fallback rate is being used."
};

const RATE_CACHE_MS = 6 * 60 * 60 * 1000;
const STALE_RATE_GRACE_MS = 7 * 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 4000;
const REQUEST_RETRIES = 2;

let cachedRates = {
  ...FALLBACK_RATES,
  cacheExpiresAt: 0
};

function normalizeRates(input, overrides = {}) {
  const inputRates =
    input?.rates instanceof Map ? Object.fromEntries(input.rates) : input?.rates || {};
  const overrideRates =
    overrides?.rates instanceof Map ? Object.fromEntries(overrides.rates) : overrides?.rates || {};
  const normalizedRates = Object.fromEntries(
    Object.entries({
      ...inputRates,
      ...overrideRates
    }).map(([currency, value]) => [currency, Number(value)])
  );

  normalizedRates[DEFAULT_BASE] = 1;

  return {
    base: input?.base || overrides?.base || DEFAULT_BASE,
    rates: normalizedRates,
    fetchedAt: input?.fetchedAt || overrides?.fetchedAt || null,
    source: overrides?.source || input?.source || "unknown",
    stale: overrides?.stale ?? input?.stale ?? false,
    fallbackReason: overrides?.fallbackReason || input?.fallbackReason || "",
    cacheExpiresAt: overrides?.cacheExpiresAt ?? input?.cacheExpiresAt ?? 0
  };
}

function isFresh(rateInfo, maxAgeMs = RATE_CACHE_MS) {
  if (!rateInfo?.fetchedAt) return false;
  return Date.now() - new Date(rateInfo.fetchedAt).getTime() < maxAgeMs;
}

function isUsableStaleRate(rateInfo) {
  if (!rateInfo?.fetchedAt) return false;
  return Date.now() - new Date(rateInfo.fetchedAt).getTime() < STALE_RATE_GRACE_MS;
}

function buildEndpoint(base = DEFAULT_BASE, quotes = DEFAULT_QUOTES) {
  const params = new URLSearchParams({
    base,
    quotes: quotes.join(",")
  });

  return `https://api.frankfurter.dev/v2/rates?${params.toString()}`;
}

async function pause(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchLatestRates(base = DEFAULT_BASE, quotes = DEFAULT_QUOTES) {
  const url = buildEndpoint(base, quotes);
  let lastError = null;

  for (let attempt = 0; attempt <= REQUEST_RETRIES; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url, REQUEST_TIMEOUT_MS);
      if (!response.ok) {
        throw new Error(`Rate request failed with ${response.status}`);
      }

      const payload = await response.json();
      const fetchedAt = payload?.date || new Date().toISOString().slice(0, 10);
      const rates = quotes.reduce((acc, currency) => {
        const nextValue = Number(payload?.rates?.[currency]);
        if (!Number.isFinite(nextValue) || nextValue <= 0) {
          throw new Error(`Invalid ${currency} rate received`);
        }
        acc[currency] = nextValue;
        return acc;
      }, {});

      return normalizeRates({
        base,
        rates,
        fetchedAt,
        source: "frankfurter"
      });
    } catch (error) {
      lastError = error;
      if (attempt < REQUEST_RETRIES) {
        await pause(350 * (attempt + 1));
      }
    }
  }

  throw lastError || new Error("Exchange-rate request failed");
}

async function readStoredRates(base = DEFAULT_BASE) {
  const storedRate = await ExchangeRate.findOne({ base }).lean();
  if (!storedRate) return null;
  return normalizeRates({
    base: storedRate.base,
    rates: storedRate.rates,
    fetchedAt: storedRate.fetchedAt,
    source: storedRate.source || "database"
  });
}

async function persistRates(rateInfo) {
  await ExchangeRate.findOneAndUpdate(
    { base: rateInfo.base },
    {
      base: rateInfo.base,
      rates: rateInfo.rates,
      fetchedAt: new Date(rateInfo.fetchedAt),
      source: rateInfo.source
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

function cacheRateInfo(rateInfo, ttlMs = RATE_CACHE_MS) {
  cachedRates = normalizeRates(rateInfo, {
    cacheExpiresAt: Date.now() + ttlMs
  });
  return cachedRates;
}

export async function getExchangeRates(base = DEFAULT_BASE, quotes = DEFAULT_QUOTES) {
  if (cachedRates.cacheExpiresAt > Date.now()) {
    return cachedRates;
  }

  const storedRate = await readStoredRates(base);
  if (storedRate && isFresh(storedRate)) {
    return cacheRateInfo(storedRate);
  }

  try {
    const liveRates = await fetchLatestRates(base, quotes);
    await persistRates(liveRates);
    return cacheRateInfo(liveRates);
  } catch (_error) {
    if (storedRate && isUsableStaleRate(storedRate)) {
      return cacheRateInfo(
        normalizeRates(storedRate, {
          source: "database-fallback",
          stale: true,
          fallbackReason: "Showing the last saved exchange rate because the live provider did not respond."
        }),
        15 * 60 * 1000
      );
    }

    return cacheRateInfo(FALLBACK_RATES, 15 * 60 * 1000);
  }
}

export function convertAmount(amount, fromCurrency, toCurrency, exchangeRates = FALLBACK_RATES) {
  const numericAmount = Number(amount || 0);
  const base = exchangeRates?.base || DEFAULT_BASE;
  const rates = exchangeRates?.rates || FALLBACK_RATES.rates;

  if (fromCurrency === toCurrency) {
    return numericAmount;
  }

  const fromBaseAmount =
    fromCurrency === base ? numericAmount : numericAmount / (Number(rates[fromCurrency]) || 1);

  return toCurrency === base
    ? fromBaseAmount
    : fromBaseAmount * (Number(rates[toCurrency]) || 1);
}

export function toCad(amount, currency, exchangeRates = FALLBACK_RATES) {
  return convertAmount(amount, currency, "CAD", exchangeRates);
}

export function formatExchangeRate(rateInfo) {
  return {
    base: rateInfo.base,
    rates: rateInfo.rates,
    fetchedAt: rateInfo.fetchedAt,
    source: rateInfo.source,
    stale: Boolean(rateInfo.stale),
    fallbackReason: rateInfo.fallbackReason || ""
  };
}

export function formatMoney(amount, currency = "CAD") {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(amount || 0);
}
