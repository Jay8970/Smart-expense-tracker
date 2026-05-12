import { convertFromBase, formatMoney } from "../utils/api.js";

function roundToTwo(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function monthsBetween(startDate, endDate) {
  return Math.max(
    (endDate.getFullYear() - startDate.getFullYear()) * 12 + endDate.getMonth() - startDate.getMonth(),
    1
  );
}

function convertGoalAmount(amount, fromCurrency, toCurrency, exchangeRate) {
  const numericAmount = Number(amount || 0);
  if (fromCurrency === toCurrency) return numericAmount;
  const inrRate = Number(exchangeRate?.rates?.INR || 60) || 60;
  if (fromCurrency === "INR" && toCurrency === "CAD") return roundToTwo(numericAmount / inrRate);
  if (fromCurrency === "CAD" && toCurrency === "INR") return convertFromBase(numericAmount, "INR", exchangeRate);
  return numericAmount;
}

function getProgressTone(goal) {
  const today = new Date();
  const createdAt = new Date(goal.createdAt || today);
  const targetDate = new Date(goal.targetDate);
  const totalMonths = monthsBetween(createdAt, targetDate);
  const elapsedMonths = Math.max(
    Math.min(monthsBetween(createdAt, today), totalMonths),
    0
  );
  const expectedSaved = roundToTwo((goal.targetAmount / totalMonths) * elapsedMonths);
  const actualSaved = Number(goal.savedAmount || 0);
  const progressRatio = expectedSaved > 0 ? actualSaved / expectedSaved : actualSaved > 0 ? 1 : 0;

  if (targetDate < today || progressRatio < 0.5) return "behind";
  if (progressRatio < 0.8) return "warning";
  return "on-track";
}

function getGoalStatus(goal) {
  const today = new Date();
  const targetDate = new Date(goal.targetDate);
  if ((goal.status || "").toLowerCase() === "completed") return { label: "Completed", tone: "completed" };
  if (targetDate < today) return { label: "Overdue", tone: "overdue" };
  if ((goal.status || "").toLowerCase() === "saving") return { label: "Saving", tone: "saving" };
  return { label: "Planning", tone: "planning" };
}

export default function GoalList({ goals, onEdit, onDelete, displayCurrency = "CAD", exchangeRate }) {
  const summary = goals.reduce(
    (acc, goal) => {
      const targetInDisplay = convertGoalAmount(goal.targetAmount, goal.currency, displayCurrency, exchangeRate);
      const monthsLeft = Math.max(monthsBetween(new Date(), new Date(goal.targetDate)), 1);
      const remaining = Math.max(Number(goal.targetAmount || 0) - Number(goal.savedAmount || 0), 0);
      const monthlyNeeded = convertGoalAmount(remaining, goal.currency, displayCurrency, exchangeRate) / monthsLeft;

      acc.totalTarget += Number(targetInDisplay || 0);
      acc.monthlyNeeded += Number(monthlyNeeded || 0);
      return acc;
    },
    { totalTarget: 0, monthlyNeeded: 0 }
  );

  return (
    <section className="panel">
      <div className="section-heading">
        <p>Future planning</p>
        <h2>Upcoming expenses</h2>
      </div>
      {goals.length > 0 && (
        <section className="goal-summary-banner">
          <article>
            <span>Total across all goals</span>
            <strong>{formatMoney(summary.totalTarget, displayCurrency)}</strong>
          </article>
          <article>
            <span>You need to save</span>
            <strong>{formatMoney(summary.monthlyNeeded, displayCurrency)} / month</strong>
          </article>
        </section>
      )}
      <div className="goal-list">
        {goals.length === 0 && <p className="muted">No future plans yet. Add one to see savings progress.</p>}
        {goals.map((goal) => {
          const progress = Math.min((goal.savedAmount / goal.targetAmount) * 100, 100) || 0;
          const progressTone = getProgressTone(goal);
          const goalStatus = getGoalStatus(goal);

          return (
            <article className="goal-card" key={goal._id}>
              <div>
                <h3>{goal.title}</h3>
                <p>{goal.category} by {new Date(goal.targetDate).toLocaleDateString()}</p>
                <div className="meta-row">
                  <span className={`currency-badge ${goal.currency.toLowerCase()}`}>
                    {formatMoney(goal.targetAmount, goal.currency)}
                  </span>
                  <span className={`status-chip priority-${(goal.priority || "Medium").toLowerCase()}`}>
                    {goal.priority || "Medium"} priority
                  </span>
                  <span className={`status-chip status-${goalStatus.tone}`}>{goalStatus.label}</span>
                </div>
              </div>
              <div className={`progress-track progress-${progressTone}`}>
                <span style={{ width: `${progress}%` }} />
              </div>
              <p>
                You need to save {formatMoney(goal.monthlySavingsNeeded, goal.currency)} per month for{" "}
                {formatMoney(goal.targetAmount, goal.currency)}.
              </p>
              <div className="row-actions">
                <button className="mini" onClick={() => onEdit(goal)}>Edit</button>
                <button className="mini danger" onClick={() => onDelete(goal._id)}>Delete</button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
