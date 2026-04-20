import { formatMoney } from "../utils/api.js";

export default function GoalList({ goals, onEdit, onDelete }) {
  return (
    <section className="panel">
      <div className="section-heading">
        <p>Future planning</p>
        <h2>Upcoming expenses</h2>
      </div>
      <div className="goal-list">
        {goals.length === 0 && <p className="muted">No future plans yet. Add one to see savings progress.</p>}
        {goals.map((goal) => {
          const progress = Math.min((goal.savedAmount / goal.targetAmount) * 100, 100) || 0;

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
                  <span className="status-chip">{goal.status || "Planning"}</span>
                </div>
              </div>
              <div className="progress-track">
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
