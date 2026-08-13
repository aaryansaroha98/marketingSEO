import Link from "next/link";
import type { ReactNode } from "react";

const legalLinks = [
  ["Privacy", "/privacy"],
  ["Terms", "/terms"],
  ["Data deletion", "/data-deletion"],
  ["Support", "/support"],
] as const;

export function LegalPage({ title, summary, children }: { title: string; summary: string; children: ReactNode }) {
  return (
    <main className="legal-page">
      <nav className="legal-nav shell">
        <Link className="wordmark" href="/"><span className="brand-mark">M</span> marketpilot<span>.ai</span></Link>
        <Link className="button button-small button-ghost" href="/">Back to home</Link>
      </nav>
      <article className="legal-shell">
        <header className="legal-hero">
          <span>Quantify Terminal · MarketPilot</span>
          <h1>{title}</h1>
          <p>{summary}</p>
          <small>Effective and last updated: August 14, 2026</small>
        </header>
        <div className="legal-copy">{children}</div>
      </article>
      <div className="legal-footer shell">
        <p>MarketPilot is a private marketing workspace operated for Quantify Terminal.</p>
        <div>{legalLinks.map(([label, href]) => <a href={href} key={href}>{label}</a>)}</div>
      </div>
    </main>
  );
}
