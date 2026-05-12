import { useEffect, useMemo, useRef, useState } from "react";
import { formatMoney } from "../utils/api.js";

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
  note: "",
  receiptFile: "",
  receiptFileName: "",
  receiptMimeType: ""
};

export default function TransactionForm({ editingTransaction, onCancel, onSubmit, transactions = [] }) {
  const [form, setForm] = useState(initialState);
  const [fieldErrors, setFieldErrors] = useState({});
  const [receiptPreview, setReceiptPreview] = useState("");
  const [receiptLabel, setReceiptLabel] = useState("");
  const fieldRefs = useRef({});

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
        note: editingTransaction.note || "",
        receiptFile: editingTransaction.receiptFile || "",
        receiptFileName: editingTransaction.receiptFileName || "",
        receiptMimeType: editingTransaction.receiptMimeType || ""
      });
      setReceiptPreview(editingTransaction.receiptMimeType?.startsWith("image/") ? editingTransaction.receiptFile || "" : "");
      setReceiptLabel(editingTransaction.receiptFileName || "");
    } else {
      setForm(initialState);
      setReceiptPreview("");
      setReceiptLabel("");
    }
  }, [editingTransaction]);

  const categoryMonthlyTotal = useMemo(() => {
    const now = new Date();
    const total = transactions
      .filter((item) => {
        if (editingTransaction && item._id === editingTransaction._id) return false;
        const itemDate = new Date(item.date);
        return (
          item.type === "expense" &&
          item.category === form.category &&
          item.currency === form.currency &&
          itemDate.getFullYear() === now.getFullYear() &&
          itemDate.getMonth() === now.getMonth()
        );
      })
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return total;
  }, [transactions, form.category, form.currency, editingTransaction]);

  function updateField(event) {
    const { name, type, checked, value } = event.target;
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[name];
      return next;
    });
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }

  function setFieldRef(name) {
    return (node) => {
      fieldRefs.current[name] = node;
    };
  }

  async function handleReceiptChange(event) {
    const file = event.target.files?.[0];
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.receiptFile;
      return next;
    });

    if (!file) {
      setForm((current) => ({ ...current, receiptFile: "", receiptFileName: "", receiptMimeType: "" }));
      setReceiptPreview("");
      setReceiptLabel("");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      setFieldErrors((current) => ({ ...current, receiptFile: "Please choose a jpg, png, or pdf file" }));
      return;
    }

    const fileData = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Could not read receipt file"));
      reader.readAsDataURL(file);
    }).catch(() => "");

    if (!fileData) {
      setFieldErrors((current) => ({ ...current, receiptFile: "Could not read receipt file" }));
      return;
    }

    setForm((current) => ({
      ...current,
      receiptFile: fileData,
      receiptFileName: file.name,
      receiptMimeType: file.type
    }));
    setReceiptPreview(file.type.startsWith("image/") ? fileData : "");
    setReceiptLabel(file.name);
  }

  function validateForm() {
    const errors = {};

    if (!form.title.trim()) errors.title = "This field is required";
    if (!form.category) errors.category = "This field is required";
    if (!form.currency) errors.currency = "This field is required";
    if (!form.date) errors.date = "This field is required";
    if (form.amount === "" || form.amount === null || form.amount === undefined) {
      errors.amount = "This field is required";
    } else if (!Number.isFinite(Number(form.amount)) || Number(form.amount) <= 0) {
      errors.amount = "Please enter a valid amount";
    }

    return errors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const errors = validateForm();
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      const firstErrorField = ["title", "amount", "category", "currency", "date"].find((field) => errors[field]);
      const target = fieldRefs.current[firstErrorField];
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      target?.focus?.();
      return;
    }

    await onSubmit({ ...form, type: "expense", amount: Number(form.amount) });
    setForm(initialState);
    setFieldErrors({});
    setReceiptPreview("");
    setReceiptLabel("");
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
          <select
            className={fieldErrors.currency ? "input-error" : ""}
            name="currency"
            ref={setFieldRef("currency")}
            value={form.currency}
            onChange={updateField}
          >
            <option value="CAD">CAD</option>
            <option value="INR">INR</option>
          </select>
          {fieldErrors.currency && <p className="form-error">{fieldErrors.currency}</p>}
        </label>
        <label>
          Title
          <input
            className={fieldErrors.title ? "input-error" : ""}
            name="title"
            ref={setFieldRef("title")}
            value={form.title}
            onChange={updateField}
            placeholder="Groceries"
          />
          {fieldErrors.title && <p className="form-error">{fieldErrors.title}</p>}
        </label>
        <label>
          Category
          <select
            className={fieldErrors.category ? "input-error" : ""}
            name="category"
            ref={setFieldRef("category")}
            value={form.category}
            onChange={updateField}
          >
            {expenseCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          {fieldErrors.category && <p className="form-error">{fieldErrors.category}</p>}
        </label>
        <label>
          Amount
          <input
            className={fieldErrors.amount ? "input-error" : ""}
            name="amount"
            ref={setFieldRef("amount")}
            type="number"
            min="0"
            value={form.amount}
            onChange={updateField}
          />
          {fieldErrors.amount && <p className="form-error">{fieldErrors.amount}</p>}
        </label>
        <label>
          Date
          <input
            className={fieldErrors.date ? "input-error" : ""}
            name="date"
            ref={setFieldRef("date")}
            type="date"
            value={form.date}
            onChange={updateField}
          />
          {fieldErrors.date && <p className="form-error">{fieldErrors.date}</p>}
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
        <label className="full">
          Receipt (optional)
          <input
            accept="image/*,.pdf"
            capture="environment"
            name="receiptFile"
            type="file"
            onChange={handleReceiptChange}
          />
          {fieldErrors.receiptFile && <p className="form-error">{fieldErrors.receiptFile}</p>}
        </label>
        {(receiptPreview || receiptLabel) && (
          <div className="receipt-preview full">
            {receiptPreview ? (
              <img className="receipt-preview-image" src={receiptPreview} alt="Receipt preview" />
            ) : (
              <div className="receipt-preview-file">{receiptLabel || "Receipt attached"}</div>
            )}
          </div>
        )}
        {categoryMonthlyTotal > 0 && (
          <div className="category-spend-box full">
            You&apos;ve spent {formatMoney(categoryMonthlyTotal, form.currency)} this month in {form.category}
          </div>
        )}
        <div className="actions">
          <button type="submit">{editingTransaction ? "Save changes" : "Add expense"}</button>
          {editingTransaction && (
            <button className="ghost" type="button" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
