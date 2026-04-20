import { useMemo, useState } from "react";
import { formatMoney } from "../utils/api.js";
import { getCategoryIcon } from "../utils/categoryIcons.js";

const categories = ["All", "Food", "Rent", "Travel", "Shopping", "Fuel", "Bills", "Education", "Entertainment", "Health", "Other"];

export default function TransactionList({ transactions, onEdit, onDelete, onExportCsv }) {
  const [filters, setFilters] = useState({
    search: "",
    currency: "All",
    category: "All",
    from: "",
    to: ""
  });

  function updateFilter(event) {
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  const filteredTransactions = useMemo(() => {
    return transactions.filter((item) => {
      const itemDate = item.date.slice(0, 10);
      const matchesSearch =
        !filters.search ||
        item.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.note?.toLowerCase().includes(filters.search.toLowerCase());
      const matchesCurrency = filters.currency === "All" || item.currency === filters.currency;
      const matchesCategory = filters.category === "All" || item.category === filters.category;
      const matchesFrom = !filters.from || itemDate >= filters.from;
      const matchesTo = !filters.to || itemDate <= filters.to;
      return matchesSearch && matchesCurrency && matchesCategory && matchesFrom && matchesTo;
    });
  }, [transactions, filters]);

  return (
    <section className="panel">
      <div className="section-heading">
        <p>History</p>
        <h2>Transactions</h2>
      </div>
      <div className="filter-grid">
        <label>
          Search expenses
          <input name="search" value={filters.search} onChange={updateFilter} placeholder="Search title or note" />
        </label>
        <label>
          Currency
          <select name="currency" value={filters.currency} onChange={updateFilter}>
            <option value="All">All</option>
            <option value="CAD">CAD</option>
            <option value="INR">INR</option>
          </select>
        </label>
        <label>
          Category
          <select name="category" value={filters.category} onChange={updateFilter}>
            {categories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </label>
        <label>
          From
          <input name="from" type="date" value={filters.from} onChange={updateFilter} />
        </label>
        <label>
          To
          <input name="to" type="date" value={filters.to} onChange={updateFilter} />
        </label>
        <div className="actions">
          <button className="ghost" type="button" onClick={() => onExportCsv(filteredTransactions)}>
            Export CSV
          </button>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Category / source</th>
              <th>Type</th>
              <th>Payment</th>
              <th>Recurring</th>
              <th>Amount</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map((item) => (
              <tr key={item._id}>
                <td>{item.title}</td>
                <td><span className="category-label">{getCategoryIcon(item.category)} {item.category}</span></td>
                <td>
                  <span className={`pill ${item.type}`}>{item.type}</span>
                </td>
                <td>{item.type === "expense" ? item.paymentMethod || "Cash" : "-"}</td>
                <td>{item.recurring ? item.recurrenceFrequency : "-"}</td>
                <td>{formatMoney(item.amount, item.currency)}</td>
                <td>{new Date(item.date).toLocaleDateString()}</td>
                <td className="row-actions">
                  <button className="mini" onClick={() => onEdit(item)}>Edit</button>
                  <button className="mini danger" onClick={() => onDelete(item._id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
