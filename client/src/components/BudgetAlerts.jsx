import { formatMoney } from "../utils/api.js";

export default function BudgetAlerts({ warnings }) {
  if (!warnings?.length) return null;

  return (
    <section className="panel budget-alerts">
      <div className="section-heading">
        <p>Budget alerts</p>
        <h2>Spending warnings</h2>
      </div>
      <div className="suggestions">
        {warnings.map((warning) => (
          <article className={`suggestion-item ${warning.usedPercent >= 100 ? "urgent" : "warning"}`} key={`${warning.category}-${warning.currency}`}>
            <strong>{warning.category} budget</strong>
            <p>
              {warning.message} Used {formatMoney(warning.usedAmount, warning.currency)} of{" "}
              {formatMoney(warning.monthlyLimit, warning.currency)}.
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
