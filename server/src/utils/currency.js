export const RATES_TO_CAD = {
  CAD: 1,
  INR: 1 / 60
};

export function toCad(amount, currency) {
  return Number(amount || 0) * (RATES_TO_CAD[currency] || 1);
}

export function formatMoney(amount, currency = "CAD") {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(amount || 0);
}
