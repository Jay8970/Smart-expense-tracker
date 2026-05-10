import { useEffect, useMemo, useState } from "react";
import { formatMoney, getCurrencyLabel, storeAuth } from "../utils/api.js";
import BudgetManager from "./BudgetManager.jsx";
import CurrencyPair from "./CurrencyPair.jsx";

export default function ProfileSettings({
  auth,
  analytics,
  budgets,
  budgetUsage,
  darkMode,
  onToggleDarkMode,
  onLogout,
  onCreateBudget,
  onDeleteBudget,
  onUpdateAuth,
  api
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
  const dashboard = analytics.dashboard || {};
  const savingsProgress = useMemo(() => {
    const goal = Number(profile.monthlySavingsGoal || 0);
    const savedCad = Math.max((dashboard.totalIncome?.CAD || 0) - (dashboard.totalExpense?.CAD || 0), 0);
    return goal > 0 ? Math.min(Math.round((savedCad / goal) * 100), 100) : 0;
  }, [dashboard, profile.monthlySavingsGoal]);

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

  return (
    <div className="profile-grid">
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

      <BudgetManager budgets={budgets} budgetUsage={budgetUsage} onCreate={onCreateBudget} onDelete={onDeleteBudget} />
    </div>
  );
}
