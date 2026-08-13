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
        <div className="eyebrow"><span className="pulse" /> One workspace for focused startup growth</div>
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
              <span>{number}</span><h2>{title}</h2><p>{copy}</p><Link href="/app">Open workspace →</Link>
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
            <div className="mini-top"><span>Connected growth workflow</span><small>Real, approval-led operations</small></div>
            <div className="capability-list">
              <div><i>01</i><span><b>Understand</b><small>Startup profile, audience, offer, and voice</small></span><em>Saved</em></div>
              <div><i>02</i><span><b>Create</b><small>Campaign strategy and channel-specific drafts</small></span><em>Review</em></div>
              <div><i>03</i><span><b>Publish</b><small>Explicit approval through connected providers</small></span><em>Controlled</em></div>
              <div><i>04</i><span><b>Learn</b><small>Verified SEO, lead, and activity records</small></span><em>Measured</em></div>
            </div>
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
