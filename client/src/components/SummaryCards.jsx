import CurrencyPair from "./CurrencyPair.jsx";

export default function SummaryCards({ summary, goalCount }) {
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
      detail: "Canadian Dollar and Indian Rupee shown separately"
    },
    {
      label: "Total expense",
      value: <CurrencyPair values={dashboard.totalExpense} />,
      detail: "All expense entries"
    },
    {
      label: "Balance",
      value: <CurrencyPair values={dashboard.remainingBalance} />,
      detail: "Income minus expenses"
    },
    {
      label: "Future goals",
      value: <CurrencyPair values={dashboard.futurePlanned} />,
      detail: `${goalCount} upcoming plans`
    }
  ];

  return (
    <section className="summary-grid">
      {cards.map((card) => (
        <article className="summary-card" key={card.label}>
          <span>{card.label}</span>
          <strong>{card.value}</strong>
          {card.detail && <small>{card.detail}</small>}
        </article>
      ))}
    </section>
  );
}
