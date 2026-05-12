import { useMemo, useState } from "react";
import * as XLSX from "xlsx";

const supportedExtensions = [".csv", ".xlsx", ".xls"];
const previewColumns = {
  transactions: ["type", "title", "category", "amount", "currency", "date"],
  goals: ["title", "category", "targetAmount", "savedAmount", "currency", "targetDate"],
  budgets: ["category", "currency", "monthlyLimit"]
};

function normalizeHeader(header) {
  return String(header || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function mapRowKeys(row) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [normalizeHeader(key), value])
  );
}

function pickValue(row, keys, fallback = "") {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
      return row[key];
    }
  }
  return fallback;
}

function inferSheetType(rows) {
  const sample = rows[0];
  if (!sample) return null;
  if (sample.type !== undefined && sample.amount !== undefined) return "transactions";
  if (sample.targetamount !== undefined || sample.targetdate !== undefined) return "goals";
  if (sample.monthlylimit !== undefined) return "budgets";
  return null;
}

function parseTransactions(rows) {
  return rows.map((row) => ({
    type: String(pickValue(row, ["type"])).trim().toLowerCase(),
    title: String(pickValue(row, ["title"])).trim(),
    category: String(pickValue(row, ["category"])).trim(),
    amount: pickValue(row, ["amount"]),
    currency: String(pickValue(row, ["currency"])).trim().toUpperCase(),
    date: pickValue(row, ["date"], new Date().toISOString().slice(0, 10)),
    paymentMethod: String(pickValue(row, ["paymentmethod"])).trim(),
    recurring: pickValue(row, ["recurring"], false),
    recurrenceFrequency: String(pickValue(row, ["recurrencefrequency"], "None")).trim(),
    note: String(pickValue(row, ["note"])).trim()
  }));
}

function parseGoals(rows) {
  return rows.map((row) => ({
    title: String(pickValue(row, ["title"])).trim(),
    category: String(pickValue(row, ["category"], "Future plan")).trim(),
    targetAmount: pickValue(row, ["targetamount"]),
    savedAmount: pickValue(row, ["savedamount"], 0),
    currency: String(pickValue(row, ["currency"])).trim().toUpperCase(),
    targetDate: pickValue(row, ["targetdate"]),
    priority: String(pickValue(row, ["priority"], "Medium")).trim(),
    status: String(pickValue(row, ["status"], "Planning")).trim()
  }));
}

function parseBudgets(rows) {
  return rows.map((row) => ({
    category: String(pickValue(row, ["category"])).trim(),
    currency: String(pickValue(row, ["currency"])).trim().toUpperCase(),
    monthlyLimit: pickValue(row, ["monthlylimit"])
  }));
}

async function parseFile(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const payload = { transactions: [], goals: [], budgets: [] };

  workbook.SheetNames.forEach((sheetName) => {
    const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
    const rows = rawRows.map(mapRowKeys).filter((row) =>
      Object.values(row).some((value) => String(value).trim() !== "")
    );

    if (rows.length === 0) return;

    const normalizedSheetName = normalizeHeader(sheetName);
    const inferredType =
      normalizedSheetName.includes("transaction") ||
      normalizedSheetName.includes("expense") ||
      normalizedSheetName.includes("income")
        ? "transactions"
        : normalizedSheetName.includes("goal") || normalizedSheetName.includes("plan")
          ? "goals"
          : normalizedSheetName.includes("budget")
            ? "budgets"
            : inferSheetType(rows);

    if (inferredType === "transactions") {
      payload.transactions.push(...parseTransactions(rows));
    } else if (inferredType === "goals") {
      payload.goals.push(...parseGoals(rows));
    } else if (inferredType === "budgets") {
      payload.budgets.push(...parseBudgets(rows));
    }
  });

  return payload;
}

export default function ImportDataPanel({ api, onImported, onToast }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [parsedPayload, setParsedPayload] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const summary = useMemo(
    () => ({
      transactions: parsedPayload?.transactions?.length || 0,
      goals: parsedPayload?.goals?.length || 0,
      budgets: parsedPayload?.budgets?.length || 0
    }),
    [parsedPayload]
  );
  const totalRows = summary.transactions + summary.goals + summary.budgets;

  function renderPreviewTable(label, rows, type) {
    if (!rows.length) return null;

    const columns = previewColumns[type];
    const previewRows = rows.slice(0, 3);

    return (
      <article className="import-preview-card">
        <div className="import-preview-header">
          <strong>{label}</strong>
          <span>{rows.length} found</span>
        </div>
        <div className="table-wrap">
          <table className="import-preview-table">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, index) => (
                <tr key={`${label}-${index}`}>
                  {columns.map((column) => (
                    <td key={column}>{String(row[column] ?? "-")}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length > previewRows.length && <p className="muted">Showing the first {previewRows.length} rows.</p>}
      </article>
    );
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    setSelectedFile(file || null);
    setParsedPayload(null);
    setError("");
    setMessage("");

    if (!file) return;

    setParsing(true);
    try {
      const payload = await parseFile(file);
      if (payload.transactions.length === 0 && payload.goals.length === 0 && payload.budgets.length === 0) {
        throw new Error("No supported import rows were found in this file.");
      }
      setParsedPayload(payload);
      setMessage("File is ready to import.");
    } catch (nextError) {
      setError(nextError.message || "Could not read this file.");
    } finally {
      setParsing(false);
    }
  }

  async function handleImport() {
    if (!parsedPayload) return;

    setImporting(true);
    setError("");
    setMessage("");

    try {
      const result = await api.importData(parsedPayload);
      setMessage(result.message || "Data imported successfully.");
      onToast?.(
        `Imported ${result.counts?.transactions || 0} transactions, ${result.counts?.goals || 0} goals, and ${result.counts?.budgets || 0} budgets.`
      );
      setSelectedFile(null);
      setParsedPayload(null);
      onImported?.();
    } catch (nextError) {
      setError(nextError.message || "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <section className="panel import-panel">
      <div className="section-heading">
        <p>Import data</p>
        <h2>Upload CSV or Excel</h2>
      </div>
      <p className="muted">
        Not sure about the format? Download a sample file, fill in your data, and re-upload.
      </p>

      <div className="import-downloads">
        <a className="download-button" href="/samples/transactions-sample.csv" download>
          Download Sample CSV
        </a>
        <a className="download-button ghost-download" href="/samples/smart-expense-import-sample.xlsx" download>
          Download Sample Excel
        </a>
      </div>

      <p className="import-helper">Fill in your data, then upload below.</p>

      <div className="import-upload-row">
        <label className="upload-button">
          Choose file
          <input accept=".csv,.xlsx,.xls" type="file" onChange={handleFileChange} />
        </label>
        <button type="button" disabled={!parsedPayload || importing || parsing} onClick={handleImport}>
          {importing ? "Importing..." : "Import file"}
        </button>
      </div>

      {selectedFile && <p className="muted">Selected file: {selectedFile.name}</p>}
      {parsing && <p className="muted">Reading spreadsheet data...</p>}

      {parsedPayload && (
        <>
          <div className="import-summary">
            <article>
              <strong>{summary.transactions}</strong>
              <span>Transactions</span>
            </article>
            <article>
              <strong>{summary.goals}</strong>
              <span>Goals</span>
            </article>
            <article>
              <strong>{summary.budgets}</strong>
              <span>Budgets</span>
            </article>
          </div>

          <section className="import-confirmation">
            <div className="section-heading">
              <p>Preview</p>
              <h2>We found {totalRows} rows. Confirm import?</h2>
            </div>
            <div className="import-preview-grid">
              {renderPreviewTable("Transactions", parsedPayload.transactions, "transactions")}
              {renderPreviewTable("Goals", parsedPayload.goals, "goals")}
              {renderPreviewTable("Budgets", parsedPayload.budgets, "budgets")}
            </div>
          </section>
        </>
      )}

      {error && <p className="form-error">{error}</p>}
      {message && <p className="success-message">{message}</p>}
    </section>
  );
}
