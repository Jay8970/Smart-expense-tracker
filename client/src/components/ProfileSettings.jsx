import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { formatMoney, getCurrencyLabel, storeAuth } from "../utils/api.js";
import BudgetManager from "./BudgetManager.jsx";
import CurrencyPair from "./CurrencyPair.jsx";

export default function ProfileSettings({
  auth,
  analytics,
  budgets,
  budgetUsage,
  darkMode,
  goals,
  onToggleDarkMode,
  onLogout,
  onCreateBudget,
  onDeleteBudget,
  onUpdateAuth,
  api,
  transactions
}) {
  const [profile, setProfile] = useState({
    name: auth.user.name || "",
    email: auth.user.email || "",
    phone: auth.user.phone || "",
    profilePicture: auth.user.profilePicture || "",
    defaultCurrency: auth.user.defaultCurrency || "CAD",
    monthlySavingsGoal: auth.user.monthlySavingsGoal || 0
  });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });
  const [message, setMessage] = useState("");
  const [exporting, setExporting] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const dashboard = analytics.dashboard || {};
  const memberSinceLabel = useMemo(() => {
    if (!auth.user.createdAt) return "";
    return new Intl.DateTimeFormat("en-CA", { month: "long", year: "numeric" }).format(new Date(auth.user.createdAt));
  }, [auth.user.createdAt]);
  const savingsProgress = useMemo(() => {
    const goal = Number(profile.monthlySavingsGoal || 0);
    const savedCad = Math.max((dashboard.totalIncome?.CAD || 0) - (dashboard.totalExpense?.CAD || 0), 0);
    return goal > 0 ? Math.min(Math.round((savedCad / goal) * 100), 100) : 0;
  }, [dashboard, profile.monthlySavingsGoal]);
  const canConfirmDelete = deleteConfirmText.trim() === "DELETE";

  useEffect(() => {
    setProfile({
      name: auth.user.name || "",
      email: auth.user.email || "",
      phone: auth.user.phone || "",
      profilePicture: auth.user.profilePicture || "",
      defaultCurrency: auth.user.defaultCurrency || "CAD",
      monthlySavingsGoal: auth.user.monthlySavingsGoal || 0
    });
  }, [auth.user]);

  function updateProfileField(event) {
    setProfile((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function updatePasswordField(event) {
    setPasswordForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function resizeProfilePhoto(file) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const reader = new FileReader();

      reader.onload = () => {
        image.src = reader.result;
      };
      reader.onerror = reject;

      image.onload = () => {
        const maxSize = 500;
        const scale = Math.min(maxSize / image.width, maxSize / image.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);

        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      image.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function handlePictureUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    resizeProfilePhoto(file).then(async (profilePicture) => {
      const nextProfile = { ...profile, profilePicture };
      setProfile(nextProfile);
      setMessage("");

      try {
        const updatedAuth = await api.updateProfile({
          ...nextProfile,
          monthlySavingsGoal: Number(nextProfile.monthlySavingsGoal || 0)
        });
        storeAuth(updatedAuth);
        onUpdateAuth(updatedAuth);
        setMessage("Profile photo updated successfully.");
      } catch (error) {
        setMessage(error.message);
      }
    });
  }

  async function saveProfile(event) {
    event.preventDefault();
    setMessage("");
    const updatedAuth = await api.updateProfile({
      ...profile,
      monthlySavingsGoal: Number(profile.monthlySavingsGoal || 0)
    });
    storeAuth(updatedAuth);
    onUpdateAuth(updatedAuth);
    setMessage("Profile updated successfully.");
  }

  async function savePassword(event) {
    event.preventDefault();
    setMessage("");
    await api.updatePassword(passwordForm);
    setPasswordForm({ currentPassword: "", newPassword: "" });
    setMessage("Password updated successfully.");
  }

  async function exportAllData() {
    setExporting(true);
    setMessage("");

    try {
      const workbook = XLSX.utils.book_new();
      const transactionRows = transactions.map((item) => ({
        title: item.title,
        type: item.type,
        category: item.category,
        amount: item.amount,
        currency: item.currency,
        date: item.date?.slice?.(0, 10) || "",
        paymentMethod: item.paymentMethod || "",
        recurring: item.recurring ? item.recurrenceFrequency : "None",
        note: item.note || ""
      }));
      const goalRows = goals.map((goal) => ({
        title: goal.title,
        category: goal.category,
        targetAmount: goal.targetAmount,
        savedAmount: goal.savedAmount,
        currency: goal.currency,
        targetDate: goal.targetDate?.slice?.(0, 10) || "",
        priority: goal.priority,
        status: goal.status
      }));
      const budgetRows = budgets.map((budget) => ({
        category: budget.category,
        currency: budget.currency,
        monthlyLimit: budget.monthlyLimit
      }));

      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(transactionRows), "All transactions");
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(goalRows), "All goals");
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(budgetRows), "All budgets");

      const stamp = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `smart-expense-data-${stamp}.xlsx`);
      setMessage("Your data export is ready.");
    } catch (error) {
      setMessage(error.message || "Could not export your data.");
    } finally {
      setExporting(false);
    }
  }

  async function confirmDeleteAccount() {
    if (!canConfirmDelete) return;

    setDeletingAccount(true);
    setMessage("");

    try {
      await api.deleteAccount();
      setDeleteModalOpen(false);
      setDeleteConfirmText("");
      onLogout();
    } catch (error) {
      setMessage(error.message || "Could not delete your account.");
    } finally {
      setDeletingAccount(false);
    }
  }

  function closeDeleteModal() {
    if (deletingAccount) return;
    setDeleteModalOpen(false);
    setDeleteConfirmText("");
  }

  return (
    <>
      <div className="profile-grid">
        <div className="profile-column">
          <section className="panel profile-card">
            <div className="profile-photo-wrap">
              {profile.profilePicture ? (
                <img className="profile-photo" src={profile.profilePicture} alt="Profile" />
              ) : (
                <div className="profile-photo placeholder">{profile.name.slice(0, 1).toUpperCase() || "U"}</div>
              )}
              <label className="upload-button">
                Change Photo
                <input type="file" accept="image/*" onChange={handlePictureUpload} />
              </label>
            </div>

            <form className="form-grid" onSubmit={saveProfile}>
              <label>
                Full name
                <input name="name" value={profile.name} onChange={updateProfileField} required />
              </label>
              <label>
                Email
                <input name="email" type="email" value={profile.email} onChange={updateProfileField} required />
                <small className="muted profile-meta">Member since {memberSinceLabel || "unknown"}</small>
                <small className="muted profile-meta">Total transactions recorded: {transactions.length}</small>
              </label>
              <label>
                Phone
                <input name="phone" value={profile.phone} onChange={updateProfileField} placeholder="Optional" />
              </label>
              <label>
                Preferred chart currency
                <select name="defaultCurrency" value={profile.defaultCurrency} onChange={updateProfileField}>
                  <option value="CAD">{getCurrencyLabel("CAD")}</option>
                  <option value="INR">{getCurrencyLabel("INR")}</option>
                </select>
              </label>
              <label className="full">
                Monthly savings goal
                <input
                  name="monthlySavingsGoal"
                  type="number"
                  min="0"
                  value={profile.monthlySavingsGoal}
                  onChange={updateProfileField}
                />
              </label>
              <div className="actions full">
                <button type="submit">Save profile</button>
                <button className="ghost" type="button" onClick={onToggleDarkMode}>
                  {darkMode ? "Light mode" : "Dark mode"}
                </button>
              </div>
            </form>
            {message && <p className="success-message">{message}</p>}
          </section>

          <section className="panel">
            <div className="section-heading">
              <p>Security settings</p>
              <h2>Change password</h2>
            </div>
            <form className="form-grid" onSubmit={savePassword}>
              <label>
                Current password
                <input
                  name="currentPassword"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={updatePasswordField}
                  required
                />
              </label>
              <label>
                New password
                <input
                  name="newPassword"
                  type="password"
                  minLength="6"
                  value={passwordForm.newPassword}
                  onChange={updatePasswordField}
                  required
                />
              </label>
              <div className="actions full">
                <button type="submit">Update password</button>
                <button className="danger" type="button" onClick={onLogout}>Logout</button>
              </div>
            </form>
          </section>

          <section className="panel">
            <div className="section-heading">
              <p>Data & Privacy</p>
              <h2>Export your data</h2>
            </div>
            <div className="actions">
              <button className="outline-teal" type="button" onClick={exportAllData} disabled={exporting}>
                {exporting ? (
                  <>
                    <span className="button-spinner" aria-hidden="true" />
                    Exporting...
                  </>
                ) : (
                  "Export all my data"
                )}
              </button>
            </div>
          </section>
        </div>

        <div className="profile-column">
          <section className="panel">
            <div className="section-heading">
              <p>Account summary</p>
              <h2>Your money snapshot</h2>
            </div>
            <div className="profile-summary-grid">
              <article>
                <span>Total income</span>
                <CurrencyPair values={dashboard.totalIncome || { CAD: 0, INR: 0 }} />
              </article>
              <article>
                <span>Total expense</span>
                <CurrencyPair values={dashboard.totalExpense || { CAD: 0, INR: 0 }} />
              </article>
              <article>
                <span>Balance</span>
                <CurrencyPair values={dashboard.remainingBalance || { CAD: 0, INR: 0 }} />
              </article>
              <article>
                <span>Future plans</span>
                <CurrencyPair values={dashboard.futurePlanned || { CAD: 0, INR: 0 }} />
              </article>
            </div>
          </section>

          <section className="panel">
            <div className="section-heading">
              <p>Savings progress</p>
              <h2>Monthly goal</h2>
            </div>
            <div className="progress-track large">
              <span style={{ width: `${savingsProgress}%` }} />
            </div>
            <p className="muted">
              Charts and converted reports use {getCurrencyLabel(profile.defaultCurrency)}.
            </p>
            <p className="muted">
              {savingsProgress}% of {formatMoney(Number(profile.monthlySavingsGoal || 0), "CAD")} monthly savings goal.
            </p>
          </section>

          <BudgetManager budgets={budgets} budgetUsage={budgetUsage} onCreate={onCreateBudget} onDelete={onDeleteBudget} />
        </div>
      </div>

      <section className="panel danger-zone-card">
        <div className="section-heading">
          <p className="danger-zone-kicker">⚠️ Danger Zone</p>
          <h2>Delete your account</h2>
        </div>
        <p className="muted">
          Permanently remove your account and all transactions, goals, and budgets from this tracker.
        </p>
        <div className="actions">
          <button className="outline-danger" type="button" onClick={() => setDeleteModalOpen(true)}>
            Delete my account and all data
          </button>
        </div>
      </section>

      {deleteModalOpen && (
        <div className="modal-overlay" role="presentation" onClick={closeDeleteModal}>
          <div
            aria-labelledby="delete-account-title"
            aria-modal="true"
            className="modal-card danger-modal"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="section-heading">
              <p className="danger-zone-kicker">⚠️ Danger Zone</p>
              <h2 id="delete-account-title">Confirm account deletion</h2>
            </div>
            <p>
              This will permanently delete your account, all transactions, goals, and budgets. Type DELETE to confirm.
            </p>
            <label>
              Type DELETE to confirm
              <input value={deleteConfirmText} onChange={(event) => setDeleteConfirmText(event.target.value)} />
            </label>
            <div className="actions">
              <button className="ghost" type="button" onClick={closeDeleteModal} disabled={deletingAccount}>
                Cancel
              </button>
              <button
                className="danger-solid"
                type="button"
                onClick={confirmDeleteAccount}
                disabled={!canConfirmDelete || deletingAccount}
              >
                {deletingAccount ? (
                  <>
                    <span className="button-spinner" aria-hidden="true" />
                    Deleting...
                  </>
                ) : (
                  "Delete my account and all data"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
