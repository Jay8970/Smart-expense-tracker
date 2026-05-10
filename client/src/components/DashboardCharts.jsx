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

const colors = ["#0f766e", "#dc2626", "#2563eb", "#ca8a04", "#4f46e5", "#16a34a"];

export default function DashboardCharts({ analytics, variant = "full" }) {
  const showFullReport = variant === "full";
  const hasCategoryData = (analytics.expensesByCategory || []).length > 0;
  const hasMonthlyData = (analytics.monthlyTrend || []).length > 0;

  return (
    <section className="chart-grid">
      <article className="panel chart-panel">
        <div className="section-heading">
          <p>Expense split</p>
          <h2>Spending by category</h2>
        </div>
        {hasCategoryData ? (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={analytics.expensesByCategory}
                dataKey="amountCad"
                nameKey="category"
                cx="50%"
                cy="50%"
                outerRadius={95}
                label
              >
                {analytics.expensesByCategory.map((entry, index) => (
                  <Cell key={entry.category} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `$${Math.round(value)} CAD`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty-state">No expenses yet. Add your first expense to see category charts.</div>
        )}
      </article>

      <article className="panel chart-panel">
        <div className="section-heading">
          <p>Monthly view</p>
          <h2>Monthly expenses</h2>
        </div>
        {hasMonthlyData ? <ResponsiveContainer width="100%" height={280}>
          <BarChart data={analytics.monthlyTrend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => `$${Math.round(value)} CAD estimated`} />
            <Legend />
            <Bar dataKey="expenseCad" name="Monthly expenses" fill="#dc2626" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer> : <div className="empty-state">Monthly chart appears after adding transactions.</div>}
      </article>

      {showFullReport && <article className="panel chart-panel">
        <div className="section-heading">
          <p>Trend</p>
          <h2>Spending over time</h2>
        </div>
        {hasMonthlyData ? <ResponsiveContainer width="100%" height={280}>
          <LineChart data={analytics.monthlyTrend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => `$${Math.round(value)} CAD estimated`} />
            <Legend />
            <Line
              type="monotone"
              dataKey="expenseCad"
              name="Spending trend"
              stroke="#dc2626"
              strokeWidth={3}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer> : <div className="empty-state">Add expenses across months to see trends.</div>}
      </article>}

      {showFullReport && <article className="panel chart-panel">
        <div className="section-heading">
          <p>Comparison</p>
          <h2>Income vs expense</h2>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={analytics.monthlyTrend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => `$${Math.round(value)} CAD`} />
            <Legend />
            <Bar dataKey="incomeCad" name="Income" fill="#0f766e" radius={[6, 6, 0, 0]} />
            <Bar dataKey="expenseCad" name="Expenses" fill="#dc2626" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </article>}

    </section>
  );
}
