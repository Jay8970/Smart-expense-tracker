import { useState } from "react";

const initialState = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  resetToken: "",
  resetPassword: "",
  resetConfirmPassword: ""
};

export default function AuthForm({ onAuth, api, initialMode = "login", onModeChange }) {
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [info, setInfo] = useState("");
  const [resetStep, setResetStep] = useState("auth");
  const isRegistering = mode === "register";
  const isResetting = resetStep !== "auth";

  function validateForm() {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (isRegistering && form.name.trim().length < 2) {
      return "Name must be at least 2 characters.";
    }

    if (!emailPattern.test(form.email)) {
      return "Enter a valid email address.";
    }

    if (form.password.length < 6) {
      return "Password must be at least 6 characters.";
    }

    if (isRegistering && form.password !== form.confirmPassword) {
      return "Password and confirm password do not match.";
    }

    return "";
  }

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setInfo("");
    setSubmitting(true);

    try {
      if (resetStep === "email") {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(form.email)) {
          setError("Enter a valid email address.");
          return;
        }

        const result = await api.forgotPassword({ email: form.email.trim() });
        setForm((current) => ({ ...current, resetToken: result.resetToken }));
        setInfo(`Reset token generated: ${result.resetToken}`);
        setResetStep("token");
        return;
      }

      if (resetStep === "token") {
        if (!form.resetToken) {
          setError("Reset token is required.");
          return;
        }

        if (form.resetPassword.length < 6) {
          setError("New password must be at least 6 characters.");
          return;
        }

        if (form.resetPassword !== form.resetConfirmPassword) {
          setError("New password and confirm password do not match.");
          return;
        }

        const auth = await api.resetPassword({
          token: form.resetToken,
          password: form.resetPassword
        });
        onAuth(auth);
        return;
      }

      const validationError = validateForm();
      if (validationError) {
        setError(validationError);
        return;
      }

      const payload = isRegistering
        ? { name: form.name.trim(), email: form.email.trim(), password: form.password }
        : { email: form.email, password: form.password };
      const auth = isRegistering ? await api.register(payload) : await api.login(payload);
      onAuth(auth);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setError("");
    setInfo("");
    setResetStep("auth");
    onModeChange?.(nextMode);
  }

  function startForgotPassword() {
    setError("");
    setInfo("Enter your account email to generate a reset token.");
    setResetStep("email");
  }

  function backToLogin() {
    setError("");
    setInfo("");
    setResetStep("auth");
    setMode("login");
  }

  return (
    <section className={`auth-layout advanced-auth ${isRegistering ? "register-mode" : "login-mode"}`}>
      <div className="auth-copy">
        <p className="eyebrow">{isRegistering ? "Start tracking today" : "Private finance workspace"}</p>
        <h2>{isRegistering ? "Create your account" : "Welcome back"}</h2>
        <p>
          {isRegistering
            ? "Build a private finance workspace for expenses, income, budgets, reports, and future plans."
            : "Your transactions, goals, dashboard, and smart suggestions stay connected to your own login."}
        </p>
        <div className="auth-benefits">
          <article>
            <strong>JWT protected</strong>
            <span>Only you can access your records.</span>
          </article>
          <article>
            <strong>INR + CAD</strong>
            <span>Keep original currency totals clear.</span>
          </article>
          <article>
            <strong>Smart suggestions</strong>
            <span>Get rule-based money saving advice.</span>
          </article>
        </div>
      </div>

      <form className="panel auth-panel" onSubmit={handleSubmit}>
        <div className="section-heading">
          <p>{isRegistering ? "Register" : "Login"}</p>
          <h2>{isRegistering ? "Set up your profile" : "Open your dashboard"}</h2>
        </div>
        {!isResetting && (
          <div className="auth-tabs">
            <button
              className={mode === "login" ? "" : "ghost"}
              type="button"
              onClick={() => switchMode("login")}
            >
              Login
            </button>
            <button
              className={mode === "register" ? "" : "ghost"}
              type="button"
              onClick={() => switchMode("register")}
            >
              Register
            </button>
          </div>
        )}

        {resetStep === "auth" && (
          <>
            {isRegistering && (
              <label>
                Name
                <input name="name" value={form.name} onChange={updateField} placeholder="Your name" required />
              </label>
            )}
            <label>
              Email
              <input name="email" type="email" value={form.email} onChange={updateField} placeholder="you@example.com" required />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                minLength="6"
                value={form.password}
                onChange={updateField}
                placeholder="At least 6 characters"
                required
              />
            </label>
            {isRegistering && (
              <label>
                Confirm password
                <input
                  name="confirmPassword"
                  type="password"
                  minLength="6"
                  value={form.confirmPassword}
                  onChange={updateField}
                  placeholder="Re-enter password"
                  required
                />
              </label>
            )}
          </>
        )}

        {resetStep === "email" && (
          <label>
            Account email
            <input name="email" type="email" value={form.email} onChange={updateField} placeholder="you@example.com" required />
          </label>
        )}

        {resetStep === "token" && (
          <>
            <label>
              Reset token
              <input name="resetToken" value={form.resetToken} onChange={updateField} required />
            </label>
            <label>
              New password
              <input name="resetPassword" type="password" minLength="6" value={form.resetPassword} onChange={updateField} required />
            </label>
            <label>
              Confirm new password
              <input name="resetConfirmPassword" type="password" minLength="6" value={form.resetConfirmPassword} onChange={updateField} required />
            </label>
          </>
        )}

        {error && <p className="form-error">{error}</p>}
        {info && <p className="success-message">{info}</p>}

        <button type="submit" disabled={submitting}>
          {submitting
            ? "Please wait..."
            : resetStep === "email"
              ? "Generate reset token"
              : resetStep === "token"
                ? "Reset password"
                : isRegistering
                  ? "Create account"
                  : "Login"}
        </button>
        {!isRegistering && resetStep === "auth" && (
          <button
            className="link-button"
            type="button"
            onClick={startForgotPassword}
          >
            Forgot password?
          </button>
        )}
        {isResetting && (
          <button className="link-button" type="button" onClick={backToLogin}>
            Back to login
          </button>
        )}
      </form>
    </section>
  );
}
