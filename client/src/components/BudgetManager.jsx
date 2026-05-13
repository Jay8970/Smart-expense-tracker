import { useState } from "react";
import { formatMoney } from "../utils/api.js";
import { getCategoryIcon } from "../utils/categoryIcons.js";

const categories = [
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

const initialState = {
  category: "Food",
  currency: "CAD",
  monthlyLimit: ""
};

function convertBudgetAmount(amount, sourceCurrency, displayCurrency, exchangeRate) {
  const numericAmount = Number(amount || 0);
  if (!displayCurrency || sourceCurrency === displayCurrency) return numericAmount;

  const inrRate = Number(exchangeRate?.rates?.INR || 60);
  if (sourceCurrency === "INR" && displayCurrency === "CAD") {
    return numericAmount / inrRate;
  }

  if (sourceCurrency === "CAD" && displayCurrency === "INR") {
    return numericAmount * inrRate;
  }

  return numericAmount;
}

export default function BudgetManager({
  budgets,
  budgetUsage = [],
  onCreate,
  onDelete,
  displayCurrency = null,
  exchangeRate = null,
  layout = "stack"
}) {
  const [form, setForm] = useState(initialState);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (Number(form.monthlyLimit) <= 0) return;
    await onCreate({ ...form, monthlyLimit: Number(form.monthlyLimit) });
    setForm(initialState);
  }

  function findUsage(budget) {
    return budgetUsage.find(
      (item) => item.category === budget.category && item.currency === budget.currency
    );
  }

  function formatBudgetDisplay(amount, currency) {
    if (!displayCurrency) {
      return formatMoney(amount, currency);
    }

    return formatMoney(convertBudgetAmount(amount, currency, displayCurrency, exchangeRate), displayCurrency);
  }

  return (
    <section className={`panel budget-manager-panel ${layout === "grid" ? "budget-manager-grid-layout" : ""}`}>
      <div className="section-heading">
        <p>Monthly budget limit</p>
        <h2>Category budgets</h2>
      </div>
      <form className="form-grid" onSubmit={handleSubmit}>
        <label>
          Category
          <select name="category" value={form.category} onChange={updateField}>
            {categories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </label>
        <label>
          Currency
          <select name="currency" value={form.currency} onChange={updateField}>
            <option value="CAD">CAD</option>
            <option value="INR">INR</option>
          </select>
        </label>
        <label>
          Monthly limit
          <input name="monthlyLimit" type="number" min="0" value={form.monthlyLimit} onChange={updateField} required />
        </label>
        <div className="actions">
          <button type="submit">Save budget</button>
        </div>
      </form>

      <div className={`budget-list ${layout === "grid" ? "budget-list-grid" : ""}`}>
        {budgets.length === 0 && <p className="muted">No budgets yet. Add a category limit to unlock warnings.</p>}
        {budgets.map((budget) => (
          <article className="budget-row" key={budget._id}>
            <div>
              <span className="category-label">{getCategoryIcon(budget.category)} {budget.category}</span>
              <div className="progress-track">
                <span style={{ width: `${Math.min(findUsage(budget)?.usedPercent || 0, 100)}%` }} />
              </div>
              <small>
                {findUsage(budget)?.usedPercent || 0}% used · {formatBudgetDisplay(findUsage(budget)?.usedAmount || 0, budget.currency)}
              </small>
            </div>
            <strong>{formatBudgetDisplay(budget.monthlyLimit, budget.currency)}</strong>
            <button className="mini danger" type="button" onClick={() => onDelete(budget._id)}>Delete</button>
          </article>
        ))}
      </div>
    </section>
  );
}
