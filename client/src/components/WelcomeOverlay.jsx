export default function WelcomeOverlay({ user }) {
  return (
    <div className="welcome-overlay" role="status" aria-live="polite">
      <div className="welcome-card">
        <div className="welcome-mark namaste-mark" aria-hidden="true">🙏</div>
        <p className="eyebrow">Namaste</p>
        <h2>Namaste, {user?.name || "there"}.</h2>
        <p>Your smart finance dashboard is ready.</p>
        <div className="welcome-loader">
          <span />
        </div>
      </div>
    </div>
  );
}
