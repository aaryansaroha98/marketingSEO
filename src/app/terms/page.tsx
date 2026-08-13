import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Terms of Use | MarketPilot AI", description: "Terms governing use of the private MarketPilot workspace." };

export default function TermsPage() {
  return <LegalPage title="Terms of Use" summary="These terms govern use of MarketPilot, a private marketing operations workspace used for Quantify Terminal.">
    <section><h2>1. Authorized use</h2><p>MarketPilot is intended for its authorized owner and approved operators. You must protect login credentials, provider credentials, and connected accounts, and promptly revoke access if compromise is suspected.</p></section>
    <section><h2>2. Lawful marketing</h2><p>You are responsible for ensuring campaigns, lead processing, email, media, and social publishing comply with applicable law, consent requirements, intellectual-property rights, advertising rules, and each connected provider’s policies. MarketPilot must not be used for spam, impersonation, deception, harassment, unauthorized surveillance, or unlawful content.</p></section>
    <section><h2>3. AI-generated material</h2><p>AI and fallback generation can be incomplete or inaccurate. Output is a draft, not legal, financial, medical, or other professional advice. The owner must verify claims, links, rights, targeting, and factual accuracy before approval or publication.</p></section>
    <section><h2>4. Connected services</h2><p>X, LinkedIn, Meta/Instagram, Reddit, Brevo, OpenRouter, Cloudinary, hosting, and database providers are independent services. Their availability, review decisions, rate limits, policies, and retention practices are outside MarketPilot’s control. Connecting a service authorizes only the actions requested through the workspace.</p></section>
    <section><h2>5. Publishing controls</h2><p>Content must be deliberately approved before MarketPilot attempts publication. You remain responsible for the final destination, audience, attachments, and consequences of publication. Removing a MarketPilot record does not necessarily remove a post already accepted by a provider.</p></section>
    <section><h2>6. Availability and changes</h2><p>The service may be interrupted by maintenance, free-tier sleep, provider outages, credential expiry, or API changes. Features and these terms may be updated to maintain security, accuracy, or provider compatibility.</p></section>
    <section><h2>7. Disclaimer and responsibility</h2><p>MarketPilot is provided on an “as available” basis without a promise of uninterrupted operation or particular marketing results. To the extent permitted by law, the operator is not responsible for indirect losses caused by generated output, provider decisions, outages, or unauthorized credential use.</p></section>
    <section><h2>8. Termination and contact</h2><p>Access may be disabled to protect the service or connected accounts. You may stop using MarketPilot and disconnect providers at any time. Questions can be submitted through <a href="/support">Support</a>.</p></section>
  </LegalPage>;
}
