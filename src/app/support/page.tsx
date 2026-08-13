import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Support | MarketPilot AI", description: "Support and service-status resources for MarketPilot." };

export default function SupportPage() {
  return <LegalPage title="Support" summary="Use these resources for workspace access, service status, provider connections, privacy, or data deletion.">
    <section><h2>Workspace</h2><p>Authorized owners can open the protected workspace to manage startup information, campaigns, content, leads, SEO checks, AI status, and provider connections.</p><div className="legal-actions"><Link className="button button-primary" href="/app">Open workspace</Link><Link className="button button-ghost" href="/api/health">Check system health</Link></div></section>
    <section><h2>Report an issue</h2><p>Use the project issue tracker for reproducible technical problems, policy questions, or deletion assistance. Include the affected feature, approximate time, expected behavior, and the non-sensitive error message.</p><a className="legal-external-link" href="https://github.com/aaryansaroha98/marketingSEO/issues" target="_blank" rel="noreferrer">Open the MarketPilot issue tracker ↗</a></section>
    <section><h2>Protect your credentials</h2><p><strong>Never post passwords, OAuth codes, API keys, client secrets, bearer tokens, database URLs, private lead information, or screenshots containing credentials.</strong> If a credential has been exposed, revoke or rotate it with the provider before requesting support.</p></section>
    <section><h2>Connection troubleshooting</h2><p>OAuth callback URLs are destinations for providers, not pages to open manually. Always begin from <strong>MarketPilot → Setup → Connect</strong>, authorize on the provider website, and allow the provider to redirect back with a temporary code and state.</p></section>
    <section><h2>Policy requests</h2><p>Read the <a href="/privacy">Privacy Policy</a>, <a href="/terms">Terms of Use</a>, or <a href="/data-deletion">Data Deletion Instructions</a>. For deletion help, do not place sensitive personal information in a public report.</p></section>
  </LegalPage>;
}
