import { formatMoney, formatRateDate } from "../utils/api.js";

export default function MonthlyReport({ analytics, exchangeRate }) {
  const dashboard = analytics.dashboard || {};
  const previous = analytics.monthlyTrend?.at(-2);
  const current = analytics.monthlyTrend?.at(-1);
  const currentExpense = current?.expenseCad || 0;
  const previousExpense = previous?.expenseCad || 0;
  const change =
    previousExpense > 0 ? Math.round(((currentExpense - previousExpense) / previousExpense) * 100) : 0;

  return (
    <section className="panel">
      <div className="section-heading">
        <p>Monthly report</p>
        <h2>This month's summary</h2>
      </div>
      <div className="report-list">
        <article>
          <strong>Top category</strong>
          <span>{dashboard.topExpenseCategory || "No expenses yet"}</span>
        </article>
        <article>
          <strong>Monthly spending</strong>
          <span>
            {formatMoney(dashboard.monthlySpending?.CAD || 0, "CAD")} /{" "}
            {formatMoney(dashboard.monthlySpending?.INR || 0, "INR")}
          </span>
        </article>
        <article>
          <strong>Change from last month</strong>
          <span>{previousExpense > 0 ? `${change >= 0 ? "+" : ""}${change}%` : "Not enough data"}</span>
        </article>
        <article>
          <strong>Latest exchange rate</strong>
          <span>
            {exchangeRate?.rates?.INR
              ? `1 CAD = ${exchangeRate.rates.INR.toFixed(2)} INR`
              : "Using saved conversion"}
          </span>
        </article>
        <article>
          <strong>Rate updated on</strong>
          <span>{exchangeRate?.fetchedAt ? formatRateDate(exchangeRate.fetchedAt) : "Using fallback rate"}</span>
        </article>
      </div>
      {exchangeRate?.stale && (
        <p className="muted">
          {exchangeRate.fallbackReason || "Live exchange rates are temporarily unavailable, so the last saved rate is being shown."}
        </p>
      )}
    </section>
  );
}
