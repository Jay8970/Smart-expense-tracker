export default function Suggestions({ suggestions }) {
  return (
    <section className="panel">
      <div className="section-heading">
        <p>Smart suggestions</p>
        <h2>Money Saving Suggestions</h2>
      </div>
      <div className="suggestions">
        {suggestions.length === 0 && <p className="muted">Suggestions appear after you add income and expenses.</p>}
        {suggestions.map((suggestion) => (
          <article className={`suggestion-item ${suggestion.severity || "info"}`} key={suggestion.title || suggestion}>
            <strong>{suggestion.title || "Suggestion"}</strong>
            <p>{suggestion.message || suggestion}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
