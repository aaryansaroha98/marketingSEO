import Link from "next/link";

const outcomes = [
  ["01", "Plan", "Turn your goals, audience, and brand into an evidence-led 90-day growth plan."],
  ["02", "Create", "Generate on-brand campaigns, social content, email, and SEO briefs."],
  ["03", "Convert", "Capture, score, and nurture every lead from first touch to qualified pipeline."],
];

export default function Home() {
  return (
    <main className="landing">
      <nav className="landing-nav shell">
        <Link className="wordmark" href="/"><span className="brand-mark">M</span> marketpilot<span>.ai</span></Link>
        <div className="nav-links"><a href="#platform">Platform</a><a href="#results">Results</a></div>
        <Link className="button button-small button-ghost" href="/app">Open workspace <span>↗</span></Link>
      </nav>
      <section className="hero shell">
        <div className="eyebrow"><span className="pulse" /> Your AI growth team is online</div>
        <h1>Marketing that moves<br /><em>at the speed of ambition.</em></h1>
        <p className="hero-copy">Strategy, content, SEO, social, and qualified leads—working together in one intelligent command center.</p>
        <div className="hero-actions">
          <Link className="button button-primary" href="/app">Explore live workspace <span>→</span></Link>
          <a className="text-link" href="#platform">See how it works <span>↓</span></a>
        </div>
        <div className="trust-row"><span>One workspace</span><i /><span>Every channel</span><i /><span>Human-approved AI</span></div>
      </section>
      <section className="outcomes shell" id="platform">
        <div className="section-label">The operating system for growth</div>
        <div className="outcome-grid">
          {outcomes.map(([number, title, copy]) => (
            <article className="outcome-card" key={number}>
              <span>{number}</span><h2>{title}</h2><p>{copy}</p><b>Explore capability →</b>
            </article>
          ))}
        </div>
      </section>
      <section className="product-stage" id="results">
        <div className="shell stage-grid">
          <div className="stage-copy">
            <div className="section-label section-label-light">Intelligence, made actionable</div>
            <h2>Know what to do next.<br />And why it matters.</h2>
            <p>MarketPilot connects every campaign, ranking, conversation, and conversion—then turns the signal into your next best move.</p>
            <Link className="button button-primary" href="/app">Enter command center <span>→</span></Link>
          </div>
          <div className="mini-dashboard">
            <div className="mini-top"><span>Growth overview</span><small>Last 30 days</small></div>
            <div className="mini-metric"><small>Marketing pipeline</small><strong>$184,320</strong><em>↗ 24.8%</em></div>
            <div className="mini-chart">
              {[28, 42, 35, 54, 49, 67, 58, 76, 70, 88, 82, 96].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}
            </div>
            <div className="mini-bottom"><div><b>342</b><small>New leads</small></div><div><b>18.6%</b><small>Conversion</small></div><div><b>4.7×</b><small>Return</small></div></div>
          </div>
        </div>
      </section>
      <section className="final-cta shell">
        <div><div className="eyebrow"><span className="pulse" /> Ready when you are</div><h2>Your next growth chapter<br />starts with one click.</h2></div>
        <Link className="button button-primary" href="/app">Launch your workspace <span>→</span></Link>
      </section>
      <footer className="shell"><Link className="wordmark" href="/"><span className="brand-mark">M</span> marketpilot<span>.ai</span></Link><p>AI-powered marketing, with humans in control.</p><small>© 2026 MarketPilot AI</small></footer>
    </main>
  );
}
