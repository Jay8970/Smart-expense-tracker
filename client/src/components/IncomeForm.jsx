import { useEffect, useState } from "react";

const incomeSources = ["Salary", "Part-time job", "Freelance", "Family support", "Other"];

const initialState = {
  title: "",
  amount: "",
  currency: "CAD",
  category: "Salary",
  date: new Date().toISOString().slice(0, 10),
  recurring: false,
  note: ""
};

export default function IncomeForm({ editingIncome, onCancel, onSubmit }) {
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editingIncome) {
      setForm({
        title: editingIncome.title,
        amount: editingIncome.amount,
        currency: editingIncome.currency,
        category: editingIncome.category,
        date: editingIncome.date.slice(0, 10),
        recurring: Boolean(editingIncome.recurring),
        note: editingIncome.note || ""
      });
    } else {
      setForm(initialState);
    }
  }, [editingIncome]);

  function updateField(event) {
    const { name, type, checked, value } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (form.title.trim().length < 2) {
      setError("Income title must be at least 2 characters.");
      return;
    }

    if (Number(form.amount) <= 0) {
      setError("Amount must be greater than 0.");
      return;
    }

    await onSubmit({
      ...form,
      type: "income",
      amount: Number(form.amount),
      paymentMethod: "",
      recurring: Boolean(form.recurring),
      recurrenceFrequency: form.recurring ? "Monthly" : "None",
      note: form.note.trim()
    });
    setForm(initialState);
  }

  return (
    <section className="panel">
      <div className="section-heading">
        <p>Income section</p>
        <h2>{editingIncome ? "Edit income" : "Add income"}</h2>
      </div>
      <form onSubmit={handleSubmit} className="form-grid">
        <label>
          Income title
          <input name="title" value={form.title} onChange={updateField} placeholder="Monthly salary" required />
        </label>
        <label>
          Source
          <select name="category" value={form.category} onChange={updateField} required>
            {incomeSources.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </label>
        <label>
          Amount
          <input name="amount" type="number" min="0" value={form.amount} onChange={updateField} required />
        </label>
        <label>
          Currency
          <select name="currency" value={form.currency} onChange={updateField}>
            <option value="CAD">CAD</option>
            <option value="INR">INR</option>
          </select>
        </label>
        <label>
          Date
          <input name="date" type="date" value={form.date} onChange={updateField} required />
        </label>
        <label className="check-label">
          <input name="recurring" type="checkbox" checked={form.recurring} onChange={updateField} />
          Recurring income
        </label>
        <label className="full">
          Note
          <input name="note" value={form.note} onChange={updateField} placeholder="Optional details like client, month, or source" />
        </label>
        <div className="actions full">
          <button type="submit">{editingIncome ? "Save changes" : "Add income"}</button>
          {editingIncome && (
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
