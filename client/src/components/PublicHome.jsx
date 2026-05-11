export default function PublicHome({ onNavigate }) {
  const highlights = [
    { value: "2", label: "Currencies", text: "Track INR and CAD without mixing totals." },
    { value: "80%", label: "Budget alerts", text: "See warnings before a category gets out of hand." },
    { value: "24/7", label: "Private access", text: "Your data stays tied to your own login." }
  ];

  const features = [
    "Expense and income tracking",
    "Future planning with monthly saving targets",
    "Graphs for categories, monthly spending, and trends",
    "Money saving suggestions from rule-based analysis",
    "Profile, preferences, dark mode, and budget limits",
    "CSV export and print-ready reports"
  ];

  return (
    <div className="public-page">
      <section className="public-hero">
        <div className="public-hero-copy">
          <p className="eyebrow">Smart personal finance</p>
          <h2>Know where your money goes before the month is over.</h2>
          <p>Track expenses, budgets, and plans in one clean INR and CAD workspace.</p>
          <div className="actions">
            <button type="button" onClick={() => onNavigate("Login / Register")}>Login / Register</button>
            <button className="ghost" type="button" onClick={() => onNavigate("About")}>About project</button>
          </div>
        </div>
        <div className="public-preview" aria-label="Dashboard preview">
          <div className="preview-card wide">
            <span>Total balance</span>
            <strong>CA$750 / ₹12,500</strong>
          </div>
          <div className="preview-row">
            <div className="preview-card">
              <span>Food</span>
              <strong>35%</strong>
              <small>Try meal planning</small>
            </div>
            <div className="preview-card">
              <span>Laptop goal</span>
              <strong>CA$200</strong>
              <small>Monthly saving</small>
            </div>
          </div>
          <div className="preview-bars">
            <span style={{ height: "62%" }} />
            <span style={{ height: "38%" }} />
            <span style={{ height: "78%" }} />
            <span style={{ height: "51%" }} />
            <span style={{ height: "86%" }} />
          </div>
        </div>
      </section>

      <section className="public-stats">
        {highlights.map((item) => (
          <article className="panel" key={item.label}>
            <strong>{item.value}</strong>
            <span>{item.label}</span>
            <p>{item.text}</p>
          </article>
        ))}
      </section>

      <section className="public-split">
        <div className="panel page-panel">
          <div className="section-heading">
            <p>What you can manage</p>
            <h2>Everything you need in one place</h2>
          </div>
          <ul className="feature-list advanced">
            {features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </div>
        <div className="panel page-panel accent-panel">
          <div className="section-heading">
            <p>Standout feature</p>
            <h2>Money Saving Suggestions</h2>
          </div>
          <p>Quick signals help users spot risky spending and smarter next moves at a glance.</p>
          <div className="insight-tiles">
            <article>
              <strong>Food alerts</strong>
              <span>Catch categories that rise too fast.</span>
            </article>
            <article>
              <strong>Budget watch</strong>
              <span>See when monthly limits get close.</span>
            </article>
            <article>
              <strong>Goal pressure</strong>
              <span>Know when future plans need higher saving.</span>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}
