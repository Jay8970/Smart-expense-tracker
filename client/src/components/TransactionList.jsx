import { useEffect, useMemo, useState } from "react";
import { formatMoney } from "../utils/api.js";
import { getCategoryIcon } from "../utils/categoryIcons.js";
import LoadingSpinner from "./LoadingSpinner.jsx";

const categories = ["All", "Food", "Rent", "Travel", "Shopping", "Fuel", "Bills", "Education", "Entertainment", "Health", "Other"];
const PAGE_SIZE = 10;

export default function TransactionList({ transactions, onEdit, onDelete, onBulkDelete, onExportCsv, loading = false }) {
  const [filters, setFilters] = useState({
    search: "",
    currency: "All",
    category: "All",
    from: "",
    to: ""
  });
  const [sortConfig, setSortConfig] = useState({ key: "date", direction: "desc" });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);

  function updateFilter(event) {
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function requestSort(key) {
    setSortConfig((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    );
  }

  const filteredTransactions = useMemo(() => {
    const filtered = transactions.filter((item) => {
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

    const sorted = [...filtered].sort((a, b) => {
      let left = a[sortConfig.key];
      let right = b[sortConfig.key];

      if (sortConfig.key === "date") {
        left = new Date(a.date).getTime();
        right = new Date(b.date).getTime();
      } else if (sortConfig.key === "amount") {
        left = Number(a.amount || 0);
        right = Number(b.amount || 0);
      } else {
        left = String(left || "").toLowerCase();
        right = String(right || "").toLowerCase();
      }

      if (left < right) return sortConfig.direction === "asc" ? -1 : 1;
      if (left > right) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [transactions, filters, sortConfig]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sortConfig]);

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => filteredTransactions.some((item) => item._id === id)));
  }, [filteredTransactions]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const paginatedTransactions = filteredTransactions.slice(startIndex, startIndex + PAGE_SIZE);
  const endIndex = Math.min(startIndex + PAGE_SIZE, filteredTransactions.length);
  const allVisibleSelected = paginatedTransactions.length > 0 && paginatedTransactions.every((item) => selectedIds.includes(item._id));

  function toggleSelectAll(event) {
    if (event.target.checked) {
      setSelectedIds((current) => Array.from(new Set([...current, ...paginatedTransactions.map((item) => item._id)])));
      return;
    }

    setSelectedIds((current) => current.filter((id) => !paginatedTransactions.some((item) => item._id === id)));
  }

  function toggleSelection(id) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedIds.length} transaction${selectedIds.length === 1 ? "" : "s"}? This cannot be undone.`
    );
    if (!confirmed) return;

    await onBulkDelete(selectedIds);
    setSelectedIds([]);
  }

  function renderSortLabel(label, key) {
    const active = sortConfig.key === key;
    const arrow = active ? (sortConfig.direction === "asc" ? " ↑" : " ↓") : "";
    return (
      <button
        className={`sort-button ${active ? "sort-button-active" : ""}`}
        type="button"
        onClick={() => requestSort(key)}
      >
        {label}{arrow}
      </button>
    );
  }

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
        <div className="actions filter-actions">
          <button className="ghost" type="button" onClick={() => onExportCsv(filteredTransactions)}>
            Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading transactions..." />
      ) : filteredTransactions.length === 0 ? (
        <div className="empty-state table-empty-state">
          No expenses yet. Add your first one to start building your history.
        </div>
      ) : (
        <>
          <div className="history-toolbar">
            <p className="muted">
              Showing {startIndex + 1}-{endIndex} of {filteredTransactions.length} transactions
            </p>
            {selectedIds.length > 0 && (
              <button className="danger" type="button" onClick={handleBulkDelete}>
                Delete selected ({selectedIds.length})
              </button>
            )}
          </div>

          <div className="table-wrap transaction-history-table">
            <table>
              <thead>
                <tr>
                  <th>
                    <input
                      aria-label="Select all visible transactions"
                      checked={allVisibleSelected}
                      type="checkbox"
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th>{renderSortLabel("Title", "title")}</th>
                  <th>{renderSortLabel("Category", "category")}</th>
                  <th>Type</th>
                  <th>Payment</th>
                  <th>Recurring</th>
                  <th>{renderSortLabel("Amount", "amount")}</th>
                  <th>{renderSortLabel("Date", "date")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {paginatedTransactions.map((item) => (
                  <tr key={item._id}>
                    <td>
                      <input
                        aria-label={`Select ${item.title}`}
                        checked={selectedIds.includes(item._id)}
                        type="checkbox"
                        onChange={() => toggleSelection(item._id)}
                      />
                    </td>
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
                      <button className="mini" type="button" onClick={() => onEdit(item)}>Edit</button>
                      <button className="mini danger" type="button" onClick={() => onDelete(item._id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="transaction-history-cards">
            {paginatedTransactions.map((item) => (
              <article className="transaction-card" key={`${item._id}-mobile`}>
                <div className="transaction-card-select">
                  <input
                    aria-label={`Select ${item.title}`}
                    checked={selectedIds.includes(item._id)}
                    type="checkbox"
                    onChange={() => toggleSelection(item._id)}
                  />
                </div>
                <div className="transaction-card-top">
                  <strong>{item.title}</strong>
                  <strong>{formatMoney(item.amount, item.currency)}</strong>
                </div>
                <div className="transaction-card-meta">
                  <span className="category-label">{getCategoryIcon(item.category)} {item.category}</span>
                  <span className={`pill ${item.type}`}>{item.type}</span>
                </div>
                <p className="transaction-card-detail">
                  {(item.type === "expense" ? item.paymentMethod || "Cash" : "-")} · {new Date(item.date).toLocaleDateString()}
                </p>
                <div className="row-actions transaction-card-actions">
                  <button className="mini" type="button" onClick={() => onEdit(item)}>Edit</button>
                  <button className="mini danger" type="button" onClick={() => onDelete(item._id)}>Delete</button>
                </div>
              </article>
            ))}
          </div>

          <div className="pagination-bar">
            <button
              className="ghost pagination-button pagination-desktop"
              disabled={safePage === 1}
              type="button"
              onClick={() => setCurrentPage((current) => Math.max(current - 1, 1))}
            >
              {"< Previous"}
            </button>
            <button
              className="ghost pagination-button pagination-mobile"
              disabled={safePage === 1}
              type="button"
              onClick={() => setCurrentPage((current) => Math.max(current - 1, 1))}
            >
              {"<"}
            </button>
            <span className="pagination-label pagination-desktop">Page {safePage} of {totalPages}</span>
            <span className="pagination-label pagination-mobile">Page {safePage}/{totalPages}</span>
            <button
              className="ghost pagination-button pagination-desktop"
              disabled={safePage === totalPages}
              type="button"
              onClick={() => setCurrentPage((current) => Math.min(current + 1, totalPages))}
            >
              {"Next >"}
            </button>
            <button
              className="ghost pagination-button pagination-mobile"
              disabled={safePage === totalPages}
              type="button"
              onClick={() => setCurrentPage((current) => Math.min(current + 1, totalPages))}
            >
              {">"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
