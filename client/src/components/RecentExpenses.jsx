import { formatMoney } from "../utils/api.js";
import { getCategoryIcon } from "../utils/categoryIcons.js";

export default function RecentExpenses({ expenses, onViewAll }) {
  const recentExpenses = expenses.slice(0, 5);

  return (
    <section className="panel">
      <div className="section-heading split-heading">
        <div>
          <p>Recent expenses</p>
          <h2>Latest spending</h2>
        </div>
        <button className="mini ghost" type="button" onClick={onViewAll}>View all</button>
      </div>
      <div className="recent-list">
        {recentExpenses.length === 0 && <p className="muted">No expenses yet. Add your first one and it will appear here.</p>}
        {recentExpenses.map((expense) => (
          <article className="recent-row" key={expense._id}>
            <div>
              <strong>{expense.title}</strong>
              <p>{getCategoryIcon(expense.category)} {expense.category} - {new Date(expense.date).toLocaleDateString()}</p>
            </div>
            <span className={`currency-badge ${expense.currency.toLowerCase()}`}>
              {formatMoney(expense.amount, expense.currency)}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
