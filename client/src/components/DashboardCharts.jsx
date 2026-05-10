import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { convertFromBase, formatMoney, getCurrencyLabel } from "../utils/api.js";

const colors = ["#0f766e", "#dc2626", "#2563eb", "#ca8a04", "#4f46e5", "#16a34a"];
const formatAxisValue = (value) => Number(value || 0).toFixed(2);
const formatChartValue = (value) => Number(value || 0).toFixed(2);

export default function DashboardCharts({
  analytics,
  exchangeRate,
  displayCurrency = "CAD",
  variant = "full"
}) {
  const showFullReport = variant === "full";
  const hasCategoryData = (analytics.expensesByCategory || []).length > 0;
  const hasMonthlyData = (analytics.monthlyTrend || []).length > 0;
  const displayCurrencyLabel = getCurrencyLabel(displayCurrency);
  const convertedCategoryData = (analytics.expensesByCategory || []).map((item) => ({
    ...item,
    convertedAmount: convertFromBase(item.amountCad, displayCurrency, exchangeRate)
  }));
  const convertedMonthlyTrend = (analytics.monthlyTrend || []).map((item) => ({
    ...item,
    incomeDisplay: convertFromBase(item.incomeCad, displayCurrency, exchangeRate),
    expenseDisplay: convertFromBase(item.expenseCad, displayCurrency, exchangeRate)
  }));

  return (
    <section className="chart-grid">
      <article className="panel chart-panel">
        <div className="section-heading">
          <p>Expense split in {displayCurrencyLabel}</p>
          <h2>Spending by category</h2>
        </div>
        {hasCategoryData ? (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={convertedCategoryData}
                dataKey="convertedAmount"
                nameKey="category"
                cx="50%"
                cy="50%"
                outerRadius={95}
                label={({ value }) => formatChartValue(value)}
              >
                {convertedCategoryData.map((entry, index) => (
                  <Cell key={entry.category} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatMoney(value, displayCurrency)} />
              <Legend />
            </PieChart>
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
              <YAxis tickFormatter={formatAxisValue} />
              <Tooltip formatter={(value) => `${formatMoney(value, displayCurrency)} estimated`} />
              <Legend />
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
                <YAxis tickFormatter={formatAxisValue} />
                <Tooltip formatter={(value) => `${formatMoney(value, displayCurrency)} estimated`} />
                <Legend />
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
              <YAxis tickFormatter={formatAxisValue} />
              <Tooltip formatter={(value) => formatMoney(value, displayCurrency)} />
              <Legend />
              <Bar dataKey="incomeDisplay" name="Income" fill="#0f766e" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expenseDisplay" name="Expenses" fill="#dc2626" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </article>
      )}
    </section>
  );
}
