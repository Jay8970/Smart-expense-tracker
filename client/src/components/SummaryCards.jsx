import CurrencyPair from "./CurrencyPair.jsx";

export default function SummaryCards({ summary, goalCount, trends = {}, loading = false }) {
  if (loading) {
    return (
      <section className="summary-grid">
        {Array.from({ length: 4 }).map((_, index) => (
          <article className="summary-card summary-card-skeleton" key={index}>
            <span className="skeleton-line skeleton-line-short" />
            <strong className="skeleton-line skeleton-line-large" />
            <small className="skeleton-line skeleton-line-medium" />
            <small className="skeleton-line skeleton-line-short" />
          </article>
        ))}
      </section>
    );
  }

  const dashboard = summary.dashboard || {
    totalIncome: { CAD: 0, INR: 0 },
    totalExpense: { CAD: 0, INR: 0 },
    remainingBalance: { CAD: 0, INR: 0 },
    futurePlanned: { CAD: 0, INR: 0 },
    monthlySpending: { CAD: 0, INR: 0 },
    topExpenseCategory: "No expenses yet",
    savingsGoalProgress: 0
  };

  const cards = [
    {
      label: "Total income",
      value: <CurrencyPair values={dashboard.totalIncome} />,
      detail: "Canadian Dollar and Indian Rupee shown separately",
      trend: trends.income
    },
    {
      label: "Total expense",
      value: <CurrencyPair values={dashboard.totalExpense} />,
      detail: "All expense entries",
      trend: trends.expense
    },
    {
      label: "Balance",
      value: <CurrencyPair values={dashboard.remainingBalance} />,
      detail: "Income minus expenses",
      trend: trends.balance
    },
    {
      label: "Future goals",
      value: <CurrencyPair values={dashboard.futurePlanned} />,
      detail: `${goalCount} upcoming plans`,
      trend: trends.futureGoals
    }
  ];

  return (
    <section className="summary-grid">
      {cards.map((card) => (
        <article className="summary-card" key={card.label}>
          <span>{card.label}</span>
          <strong>{card.value}</strong>
          {card.detail && <small>{card.detail}</small>}
          {card.trend && (
            <small className={`trend-indicator trend-${card.trend.tone}`}>
              {card.trend.text}
            </small>
          )}
        </article>
      ))}
    </section>
  );
}
