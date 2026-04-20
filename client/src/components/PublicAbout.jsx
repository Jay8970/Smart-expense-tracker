export default function PublicAbout() {
  const stack = ["React", "Node.js", "Express", "MongoDB", "JWT Auth", "Recharts"];
  const modules = [
    "Authentication and private user data",
    "Expense, income, budget, and future plan modules",
    "Dashboard calculations and analytics API",
    "Rule-based suggestion engine",
    "Profile settings with persistent photo upload"
  ];

  return (
    <div className="public-page">
      <section className="about-hero panel">
        <div>
          <p className="eyebrow">About the project</p>
          <h2>A full-stack finance tracker with practical intelligence.</h2>
          <p>
            Smart Expense Tracker helps users understand daily spending, prepare for future expenses, and
            improve saving habits with simple, explainable rules.
          </p>
        </div>
        <img
          src="https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=900&q=80"
          alt=""
        />
      </section>

      <section className="public-split">
        <div className="panel page-panel">
          <div className="section-heading">
            <p>Architecture</p>
            <h2>MERN stack structure</h2>
          </div>
          <div className="tech-list">
            {stack.map((item) => (
              <span className="status-chip" key={item}>{item}</span>
            ))}
          </div>
          <p>
            The frontend handles the user experience, while the backend protects data, stores records, and
            calculates dashboard insights.
          </p>
        </div>
        <div className="panel page-panel">
          <div className="section-heading">
            <p>Modules</p>
            <h2>Project scope</h2>
          </div>
          <ul className="feature-list advanced">
            {modules.map((module) => (
              <li key={module}>{module}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="panel page-panel">
        <div className="section-heading">
          <p>Core calculations</p>
          <h2>Simple formulas, clear results</h2>
        </div>
        <div className="calculation-grid">
          <article><strong>Total expense</strong><span>Sum all user expenses</span></article>
          <article><strong>Total income</strong><span>Sum all user incomes</span></article>
          <article><strong>Balance</strong><span>Income minus expense</span></article>
          <article><strong>Monthly saving</strong><span>Remaining target divided by months left</span></article>
        </div>
      </section>
    </div>
  );
}
