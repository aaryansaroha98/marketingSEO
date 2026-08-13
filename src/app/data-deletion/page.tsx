import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Data Deletion Instructions | MarketPilot AI", description: "How to delete MarketPilot records and revoke connected-account access." };

export default function DataDeletionPage() {
  return <LegalPage title="Data Deletion Instructions" summary="Use these steps to remove workspace records, disconnect social accounts, and revoke provider access.">
    <section><h2>1. Delete workspace records</h2><ol><li>Sign in to the private MarketPilot workspace.</li><li>Open the relevant Campaigns, Content, or Leads section.</li><li>Use the record menu and confirm deletion. Published audit records may be retained where needed for security and accountability.</li></ol></section>
    <section><h2>2. Disconnect an integration</h2><ol><li>Open <strong>Setup</strong> in MarketPilot.</li><li>Find X, LinkedIn, Instagram, or Reddit.</li><li>Select <strong>Disconnect</strong>. MarketPilot will remove its stored authorization tokens for that connection.</li></ol><p>For additional protection, open the connected provider’s account settings and revoke MarketPilot/application access there as well.</p></section>
    <section><h2>3. Remove published content</h2><p>Deleting a MarketPilot draft or disconnecting an account does not automatically delete content already published to X, LinkedIn, Instagram, or Reddit. Delete published content using the destination provider’s controls. Provider copies, logs, or backups remain governed by that provider’s policy.</p></section>
    <section><h2>4. Delete uploaded media</h2><p>When the media library is enabled, remove unreferenced assets through its delete action. An asset attached to published content may be protected from deletion to avoid breaking a live post. Provider-side copies may require separate removal.</p></section>
    <section><h2>5. Request assistance</h2><p>If you cannot access the workspace, submit a deletion request through <a href="/support">Support</a>. Identify the connected provider and account handle, but never include a password, API secret, access token, private key, or sensitive lead information in a public issue. Identity verification may be required before deletion.</p></section>
    <section><h2>6. Completion</h2><p>Verified requests are handled as reasonably practical. Some security logs, legal records, provider records, and encrypted backups may persist for a limited period before routine expiration. MarketPilot cannot delete information controlled solely by an external provider.</p></section>
  </LegalPage>;
}
