import {
  useEffect,
  useState
} from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { convertFromBase, formatMoney, getCurrencyLabel } from "../utils/api.js";
import LoadingSpinner from "./LoadingSpinner.jsx";

const colors = ["#0f766e", "#dc2626", "#2563eb", "#ca8a04", "#4f46e5", "#16a34a"];
const formatAxisValue = (value, currency) => formatMoney(Number(value || 0), currency);

export default function DashboardCharts({
  analytics,
  exchangeRate,
  displayCurrency = "CAD",
  variant = "full",
  loading = false
}) {
  const [chartReady, setChartReady] = useState(false);
  const showFullReport = variant === "full";
  const hasCategoryData = (analytics.expensesByCategory || []).length > 0;
  const hasMonthlyData = (analytics.monthlyTrend || []).length > 0;
  const displayCurrencyLabel = getCurrencyLabel(displayCurrency);
  const convertedCategoryData = (analytics.expensesByCategory || []).map((item) => ({
    ...item,
    convertedAmount: convertFromBase(item.amountCad, displayCurrency, exchangeRate)
  }));
  const categoryChartHeight = Math.max(280, convertedCategoryData.length * 48);
  const convertedMonthlyTrend = (analytics.monthlyTrend || []).map((item) => ({
    ...item,
    incomeDisplay: convertFromBase(item.incomeCad, displayCurrency, exchangeRate),
    expenseDisplay: convertFromBase(item.expenseCad, displayCurrency, exchangeRate)
  }));

  useEffect(() => {
    setChartReady(false);
    const frame = window.requestAnimationFrame(() => setChartReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, [analytics, displayCurrency, exchangeRate, variant]);

  if (loading || !chartReady) {
    return (
      <section className="chart-grid">
        <article className="panel chart-panel chart-loading-panel">
          <LoadingSpinner label="Rendering charts..." fullHeight />
        </article>
      </section>
    );
  }

  return (
    <section className="chart-grid">
      <article className="panel chart-panel">
        <div className="section-heading">
          <p>Expense split in {displayCurrencyLabel}</p>
          <h2>Spending by category</h2>
        </div>
        {hasCategoryData ? (
          <ResponsiveContainer width="100%" height={categoryChartHeight}>
            <BarChart
              data={convertedCategoryData}
              layout="vertical"
              margin={{ top: 4, right: 16, bottom: 4, left: 12 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={(value) => formatAxisValue(value, displayCurrency)} />
              <YAxis
                dataKey="category"
                type="category"
                width={110}
                tick={{ fontSize: 14, fontWeight: 700 }}
              />
              <Tooltip formatter={(value, _name, details) => [formatMoney(value, displayCurrency), details?.payload?.category || "Amount"]} />
              <Bar
                dataKey="convertedAmount"
                name="Category spending"
                radius={[0, 8, 8, 0]}
              >
                {convertedCategoryData.map((entry, index) => (
                  <Cell key={entry.category} fill={colors[index % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty-state">No expenses yet. Add your first expense to see category charts.</div>
        )}
      </article>

      <article className="panel chart-panel">
        <div className="section-heading">
          <p>Monthly view in {displayCurrencyLabel}</p>
          <h2>Monthly expenses</h2>
        </div>
        {hasMonthlyData ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={convertedMonthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => formatAxisValue(value, displayCurrency)} width={92} />
              <Tooltip formatter={(value, name) => [formatMoney(value, displayCurrency), name]} />
              <Legend wrapperStyle={{ fontSize: "0.95rem", fontWeight: 700 }} />
              <Bar dataKey="expenseDisplay" name="Monthly expenses" fill="#dc2626" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty-state">Monthly chart appears after adding transactions.</div>
        )}
      </article>

      {showFullReport && (
        <article className="panel chart-panel">
          <div className="section-heading">
            <p>Trend in {displayCurrencyLabel}</p>
            <h2>Spending over time</h2>
          </div>
          {hasMonthlyData ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={convertedMonthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => formatAxisValue(value, displayCurrency)} width={92} />
                <Tooltip formatter={(value, name) => [formatMoney(value, displayCurrency), name]} />
                <Legend wrapperStyle={{ fontSize: "0.95rem", fontWeight: 700 }} />
                <Line
                  type="monotone"
                  dataKey="expenseDisplay"
                  name="Spending trend"
                  stroke="#dc2626"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">Add expenses across months to see trends.</div>
          )}
        </article>
      )}

      {showFullReport && (
        <article className="panel chart-panel">
          <div className="section-heading">
            <p>Comparison in {displayCurrencyLabel}</p>
            <h2>Income vs expense</h2>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={convertedMonthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => formatAxisValue(value, displayCurrency)} width={92} />
              <Tooltip formatter={(value, name) => [formatMoney(value, displayCurrency), name]} />
              <Legend wrapperStyle={{ fontSize: "0.95rem", fontWeight: 700 }} />
              <Bar dataKey="incomeDisplay" name="Income" fill="#0f766e" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expenseDisplay" name="Expenses" fill="#dc2626" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </article>
      )}
    </section>
  );
}
