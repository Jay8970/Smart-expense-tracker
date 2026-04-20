import { useEffect, useState } from "react";

const expenseCategories = [
  "Food",
  "Rent",
  "Travel",
  "Shopping",
  "Fuel",
  "Bills",
  "Education",
  "Entertainment",
  "Health",
  "Other"
];

const paymentMethods = ["Cash", "Debit card", "Credit card", "UPI", "Bank transfer", "Cheque", "Other"];

const initialState = {
  title: "",
  category: "Food",
  amount: "",
  currency: "CAD",
  date: new Date().toISOString().slice(0, 10),
  paymentMethod: "Cash",
  recurring: false,
  recurrenceFrequency: "None",
  note: ""
};

export default function TransactionForm({ editingTransaction, onCancel, onSubmit }) {
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editingTransaction) {
      setForm({
        type: editingTransaction.type,
        title: editingTransaction.title,
        category: editingTransaction.category,
        amount: editingTransaction.amount,
        currency: editingTransaction.currency,
        date: editingTransaction.date.slice(0, 10),
        paymentMethod: editingTransaction.paymentMethod || "Cash",
        recurring: Boolean(editingTransaction.recurring),
        recurrenceFrequency: editingTransaction.recurrenceFrequency || "None",
        note: editingTransaction.note || ""
      });
    }
  }, [editingTransaction]);

  function updateField(event) {
    const { name, type, checked, value } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (form.title.trim().length < 2) {
      setError("Title must be at least 2 characters.");
      return;
    }

    if (Number(form.amount) <= 0) {
      setError("Amount must be greater than 0.");
      return;
    }

    await onSubmit({ ...form, type: "expense", amount: Number(form.amount) });
    setForm(initialState);
  }

  return (
    <section className="panel">
      <div className="section-heading">
        <p>Expense tracking</p>
        <h2>{editingTransaction ? "Edit expense" : "Add expense"}</h2>
      </div>
      <form onSubmit={handleSubmit} className="form-grid">
        <label>
          Currency
          <select name="currency" value={form.currency} onChange={updateField}>
            <option value="CAD">CAD</option>
            <option value="INR">INR</option>
          </select>
        </label>
        <label>
          Title
          <input name="title" value={form.title} onChange={updateField} placeholder="Groceries" required />
        </label>
        <label>
          Category
          <select name="category" value={form.category} onChange={updateField} required>
            {expenseCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label>
          Amount
          <input name="amount" type="number" min="0" value={form.amount} onChange={updateField} required />
        </label>
        <label>
          Date
          <input name="date" type="date" value={form.date} onChange={updateField} required />
        </label>
        <label>
          Payment method
          <select name="paymentMethod" value={form.paymentMethod} onChange={updateField} required>
            {paymentMethods.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </label>
        <label className="check-label">
          <input name="recurring" type="checkbox" checked={form.recurring} onChange={updateField} />
          Recurring expense
        </label>
        {form.recurring && (
          <label>
            Recurrence
            <select name="recurrenceFrequency" value={form.recurrenceFrequency} onChange={updateField}>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
              <option value="Yearly">Yearly</option>
            </select>
          </label>
        )}
        <label className="full">
          Note
          <input name="note" value={form.note} onChange={updateField} placeholder="Optional details" />
        </label>
        <div className="actions">
          <button type="submit">{editingTransaction ? "Save changes" : "Add expense"}</button>
          {editingTransaction && (
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
