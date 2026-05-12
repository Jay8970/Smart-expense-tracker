export default function NotFoundPage({ onBack, isAuthed = false }) {
  return (
    <section className="panel not-found-page">
      <p className="eyebrow">Smart Expense Tracker</p>
      <strong className="not-found-code">404</strong>
      <h1>Oops! This page doesn&apos;t exist.</h1>
      <p className="page-title-copy">
        The page you&apos;re looking for was moved or never existed.
      </p>
      <div className="actions">
        <button type="button" onClick={onBack}>
          {isAuthed ? "\u2190 Go back to Dashboard" : "\u2190 Go back to Home"}
        </button>
      </div>
    </section>
  );
}
