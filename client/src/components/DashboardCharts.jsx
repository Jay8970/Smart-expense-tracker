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
  const hasTrendData = (analytics.monthlyTrend || []).length >= 3;
  const displayCurrencyLabel = getCurrencyLabel(displayCurrency);
  const titleCurrency = `(${displayCurrency})`;
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
          <h2>Spending by category {titleCurrency}</h2>
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
                animationBegin={0}
                animationDuration={650}
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
          <div className="empty-state chart-empty-state">No data for category spending in this view yet.</div>
        )}
      </article>

      <article className="panel chart-panel">
        <div className="section-heading">
          <p>Monthly view in {displayCurrencyLabel}</p>
          <h2>Monthly income vs expenses {titleCurrency}</h2>
        </div>
        {hasMonthlyData ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={convertedMonthlyTrend} barGap={10}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis
                tickFormatter={(value) => formatAxisValue(value, displayCurrency)}
                width={92}
                label={{
                  value: `Amount (${displayCurrency})`,
                  angle: -90,
                  position: "insideLeft",
                  style: { fill: "#94a3b8", fontSize: 12, fontWeight: 700 }
                }}
              />
              <Tooltip formatter={(value, name) => [formatMoney(value, displayCurrency), name]} />
              <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: "0.95rem", fontWeight: 700, paddingTop: "12px" }} />
              <Bar
                animationBegin={0}
                animationDuration={650}
                dataKey="incomeDisplay"
                name="Income"
                fill="#0f766e"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                animationBegin={80}
                animationDuration={650}
                dataKey="expenseDisplay"
                name="Expenses"
                fill="#dc2626"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty-state chart-empty-state">No monthly income or expense data is available for this period.</div>
        )}
      </article>

      {showFullReport && (
        <article className="panel chart-panel">
        <div className="section-heading">
          <p>Trend in {displayCurrencyLabel}</p>
          <h2>Spending over time {titleCurrency}</h2>
        </div>
          {hasTrendData ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={convertedMonthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis
                  tickFormatter={(value) => formatAxisValue(value, displayCurrency)}
                  width={92}
                  label={{
                    value: `Amount (${displayCurrency})`,
                    angle: -90,
                    position: "insideLeft",
                    style: { fill: "#94a3b8", fontSize: 12, fontWeight: 700 }
                  }}
                />
                <Tooltip formatter={(value, name) => [formatMoney(value, displayCurrency), name]} />
                <Legend wrapperStyle={{ fontSize: "0.95rem", fontWeight: 700 }} />
                <Line
                  type="monotone"
                  dataKey="expenseDisplay"
                  name="Spending trend"
                  stroke="#dc2626"
                  strokeWidth={3}
                  dot={{ r: 5, strokeWidth: 2, fill: "#dc2626", stroke: "#f8fafc" }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state chart-empty-state">Add transactions across 3 or more months to see your spending trend</div>
          )}
        </article>
      )}

      {showFullReport && (
        <article className="panel chart-panel">
          <div className="section-heading">
            <p>Comparison in {displayCurrencyLabel}</p>
            <h2>Income vs expense {titleCurrency}</h2>
          </div>
          {hasMonthlyData ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={convertedMonthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => formatAxisValue(value, displayCurrency)} width={92} />
                <Tooltip formatter={(value, name) => [formatMoney(value, displayCurrency), name]} />
                <Legend wrapperStyle={{ fontSize: "0.95rem", fontWeight: 700 }} />
                <Bar
                  animationBegin={0}
                  animationDuration={650}
                  dataKey="incomeDisplay"
                  name="Income"
                  fill="#0f766e"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  animationBegin={80}
                  animationDuration={650}
                  dataKey="expenseDisplay"
                  name="Expenses"
                  fill="#dc2626"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state chart-empty-state">No income-versus-expense comparison is available for this period.</div>
          )}
        </article>
      )}
    </section>
  );
}
