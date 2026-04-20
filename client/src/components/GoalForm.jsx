import { useEffect, useState } from "react";

const initialState = {
  title: "",
  category: "Future plan",
  targetAmount: "",
  savedAmount: "",
  currency: "CAD",
  targetDate: "",
  priority: "Medium",
  status: "Planning"
};

function calculateMonthlySaving(targetAmount, savedAmount, targetDate) {
  if (!targetAmount || !targetDate) return 0;
  const now = new Date();
  const target = new Date(targetDate);
  const months = (target.getFullYear() - now.getFullYear()) * 12 + target.getMonth() - now.getMonth();
  const safeMonths = Math.max(months, 1);
  const remaining = Math.max(Number(targetAmount) - Number(savedAmount || 0), 0);
  return Math.ceil(remaining / safeMonths);
}

export default function GoalForm({ editingGoal, onCancel, onSubmit }) {
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editingGoal) {
      setForm({
        title: editingGoal.title,
        category: editingGoal.category,
        targetAmount: editingGoal.targetAmount,
        savedAmount: editingGoal.savedAmount,
        currency: editingGoal.currency,
        targetDate: editingGoal.targetDate.slice(0, 10),
        priority: editingGoal.priority || "Medium",
        status: editingGoal.status || "Planning"
      });
    }
  }, [editingGoal]);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (form.title.trim().length < 2) {
      setError("Future expense title must be at least 2 characters.");
      return;
    }

    if (Number(form.targetAmount) <= 0) {
      setError("Expected amount must be greater than 0.");
      return;
    }

    if (Number(form.savedAmount || 0) > Number(form.targetAmount)) {
      setError("Already saved cannot be greater than expected amount.");
      return;
    }

    if (new Date(form.targetDate) < new Date(new Date().toISOString().slice(0, 10))) {
      setError("Expected date should be today or later.");
      return;
    }

    await onSubmit({
      ...form,
      targetAmount: Number(form.targetAmount),
      savedAmount: Number(form.savedAmount || 0)
    });
    setForm(initialState);
  }

  const monthlySavingNeeded = calculateMonthlySaving(
    form.targetAmount,
    form.savedAmount,
    form.targetDate
  );

  return (
    <section className="panel">
      <div className="section-heading">
        <p>Future planning</p>
        <h2>{editingGoal ? "Edit future expense" : "Add future expense"}</h2>
      </div>
      <form onSubmit={handleSubmit} className="form-grid">
        <label>
          Future expense title
          <input
            name="title"
            value={form.title}
            onChange={updateField}
            placeholder="Car insurance renewal, college fees, laptop purchase"
            required
          />
        </label>
        <label>
          Plan type
          <input name="category" value={form.category} onChange={updateField} required />
        </label>
        <label>
          Expected amount
          <input
            name="targetAmount"
            type="number"
            min="0"
            value={form.targetAmount}
            onChange={updateField}
            required
          />
        </label>
        <label>
          Already saved
          <input name="savedAmount" type="number" min="0" value={form.savedAmount} onChange={updateField} />
        </label>
        <label>
          Currency
          <select name="currency" value={form.currency} onChange={updateField}>
            <option value="CAD">CAD</option>
            <option value="INR">INR</option>
          </select>
        </label>
        <label>
          Expected date
          <input name="targetDate" type="date" value={form.targetDate} onChange={updateField} required />
        </label>
        <label>
          Priority
          <select name="priority" value={form.priority} onChange={updateField}>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </label>
        <label>
          Status
          <select name="status" value={form.status} onChange={updateField}>
            <option value="Planning">Planning</option>
            <option value="Saving">Saving</option>
            <option value="Completed">Completed</option>
          </select>
        </label>
        <div className="saving-preview full">
          You need to save{" "}
          <strong>
            {new Intl.NumberFormat("en-CA", {
              style: "currency",
              currency: form.currency,
              maximumFractionDigits: 0
            }).format(monthlySavingNeeded)}
          </strong>{" "}
          per month.
        </div>
        <div className="actions full">
          <button type="submit">{editingGoal ? "Save changes" : "Add future expense"}</button>
          {editingGoal && (
            <button className="ghost" type="button" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
        {error && <p className="form-error full">{error}</p>}
      </form>
    </section>
  );
}
