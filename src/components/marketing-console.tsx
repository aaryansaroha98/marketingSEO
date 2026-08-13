"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type DashboardData } from "@/lib/api-client";
import type { BrandProfile, ContentItem, SeoResult } from "@/lib/types";

const nav = ["Overview", "Campaigns", "Content", "SEO", "Leads", "Analytics", "Setup"];
const icons: Record<string, string> = { Overview: "⌘", Campaigns: "◫", Content: "✦", SEO: "⌁", Leads: "♙", Analytics: "⌇", Setup: "⚙" };
const providerLabels: Record<string, string> = { x: "X", linkedin: "LinkedIn", instagram: "Instagram", reddit: "Reddit", brevo: "Brevo Mail" };
const blankDashboard: DashboardData = { campaigns: [], content: [], leads: [], integrations: [], metrics: { campaigns: 0, qualified_leads: 0, approved_content: 0, connected_channels: 0 } };
const blankProfile = { startup_name: "My startup", website: "", description: "", audience: "", offer: "", voice: "Clear, credible, useful" };

export function MarketingConsole() {
  const [active, setActive] = useState("Overview");
  const [data, setData] = useState<DashboardData>(blankDashboard);
  const [profile, setProfile] = useState(blankProfile);
  const [seoResult, setSeoResult] = useState<SeoResult | null>(null);
  const [seoUrl, setSeoUrl] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [campaignObjective, setCampaignObjective] = useState("Generate qualified conversations for my startup");

  const refresh = useCallback(async () => {
    try { setData(await api.dashboard()); setError(""); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Backend unavailable"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void refresh();
    void api.profile().then((value) => { setProfile(value); setSeoUrl(value.website); }).catch(() => undefined);
    void api.latestSeo().then(setSeoResult).catch(() => undefined);
  }, [refresh]);

  function notify(message: string) { setNotice(message); window.setTimeout(() => setNotice(""), 2800); }
  async function run(action: () => Promise<void>) {
    setBusy(true); setError("");
    try { await action(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Action failed"); }
    finally { setBusy(false); }
  }

  async function createCampaign() {
    if (!campaignName.trim()) return;
    await run(async () => {
      await api.createCampaign(campaignName.trim(), campaignObjective.trim());
      await refresh(); setCampaignName(""); setShowComposer(false); setActive("Campaigns"); notify("AI campaign and channel drafts created");
    });
  }

  async function handleContent(item: ContentItem) {
    await run(async () => {
      if (item.state === "Review" || item.state === "Draft") {
        await api.approveContent(item.id); notify("Content approved. Publishing still requires your action.");
      } else if (item.state === "Approved") {
        const platform = item.type.toLowerCase();
        const media = platform === "instagram" ? window.prompt("Public HTTPS image URL for Instagram:", item.media_url) ?? "" : "";
        const subreddit = platform === "reddit" ? window.prompt("Subreddit name (without r/):") ?? "" : "";
        await api.publishContent(item.id, media, subreddit); notify(`Published to ${item.type}`);
      }
      await refresh();
    });
  }

  async function connect(provider: string) {
    await run(async () => { const result = await api.connect(provider); window.location.assign(result.authorization_url); });
  }

  const qualified = useMemo(() => data.leads.filter((lead) => lead.score >= 80).length, [data.leads]);
  const latestStrategy = data.campaigns[0]?.strategy;
  const titles: Record<string, [string, string]> = {
    Overview: [`${profile.startup_name} growth command`, "Live activity from your campaigns, channels, search, and pipeline."],
    Campaigns: ["Campaign engine", "Create truthful, channel-ready growth programs from one objective."],
    Content: ["Content studio", "Approve each draft, then publish deliberately through connected accounts."],
    SEO: ["Search intelligence", "Audit your public website and prioritize technical opportunities."],
    Leads: ["Lead pipeline", "Follow up only with contacts who have recorded communication consent."],
    Analytics: ["Growth analytics", "Operational performance based on activity stored in your system."],
    Setup: ["Startup setup", "Teach the AI your business and connect your approved provider accounts."],
  };

  const CampaignList = () => <div className="campaign-list">{data.campaigns.length === 0 ? <Empty text="No campaigns yet. Create your first focused growth campaign." /> : data.campaigns.map((campaign) => <article className="campaign-row" key={campaign.id}><span className={`campaign-icon ${campaign.accent}`}>✦</span><div className="campaign-name"><b>{campaign.name}</b><small>{campaign.channel}</small></div><span className={`status status-${campaign.status.toLowerCase()}`}>{campaign.status}</span><div className="progress"><i style={{ width: `${campaign.progress}%` }} /></div><div className="campaign-leads"><b>{campaign.leads}</b><small>leads</small></div><button className="icon-button" aria-label={`Open ${campaign.name}`}>•••</button></article>)}</div>;

  const ContentList = () => <div className="content-list">{data.content.length === 0 ? <Empty text="Campaign drafts will appear here for review." /> : data.content.map((item) => <article className="content-row" key={item.id}><span className="channel-icon">{item.type.slice(0, 2)}</span><div><small>{item.type}</small><b>{item.title}</b><span>{item.time}</span></div><span className={`status status-${item.state.toLowerCase()}`}>{item.state}</span><button className="approve-button" disabled={busy || item.state === "Published"} onClick={() => void handleContent(item)}>{item.state === "Published" ? "✓ Live" : item.state === "Approved" ? "Publish" : "Approve"}</button></article>)}</div>;

  return (
    <div className="app-shell">
      <aside className="sidebar"><Link className="wordmark sidebar-logo" href="/"><span className="brand-mark">M</span> marketpilot<span>.ai</span></Link><nav className="side-nav"><small>Workspace</small>{nav.map((item) => <button className={active === item ? "active" : ""} onClick={() => setActive(item)} key={item}><span>{icons[item]}</span>{item}{item === "Content" && data.content.length > 0 && <em>{data.content.length}</em>}</button>)}</nav><div className="connected"><div className="connected-title"><span>Connected services</span><b>{data.metrics.connected_channels}</b></div><div className="channel-stack">{data.integrations.slice(0, 5).map((item) => <i key={item.provider}>{item.provider.slice(0, 2)}</i>)}</div><small><span className="live-dot" /> {error ? "Backend needs attention" : "Secure backend online"}</small></div><div className="user-card"><span>ME</span><div><b>Private workspace</b><small>Single-user mode</small></div></div></aside>
      <main className="workspace"><header className="topbar"><label className="search"><span>⌕</span><input aria-label="Search workspace" placeholder="Search your workspace..." /></label><div className="top-actions"><button className="top-icon" aria-label="System status">●<i /></button><button className="button button-dark" onClick={() => setShowComposer(true)}>＋ New campaign</button></div></header>
        <section className="workspace-body">{error && <div className="error-banner"><b>Connection issue:</b> {error}<button onClick={() => void refresh()}>Retry</button></div>}{loading && <div className="loading-bar" />}
          <div className="page-heading"><div><span className="overline">Private growth workspace</span><h1>{titles[active][0]}</h1><p>{titles[active][1]}</p></div><button className="date-control" onClick={() => void refresh()}>Refresh ↻</button></div>
          {active === "Overview" && <><div className="metric-grid"><Metric icon="◫" accent="violet" label="Campaigns" value={data.metrics.campaigns} note="persistent programs"/><Metric icon="♙" accent="cyan" label="Qualified leads" value={qualified} note="score of 80 or more"/><Metric icon="✦" accent="lime" label="Approved content" value={data.metrics.approved_content} note="ready or published"/><Metric icon="◎" accent="orange" label="Connected services" value={data.metrics.connected_channels} note="OAuth/API ready"/></div><div className="insight-grid"><article className="ai-brief"><div className="brief-head"><span className="ai-orb">✦</span><div><b>Campaign intelligence</b><small>{latestStrategy ? "Based on your latest strategy" : "Waiting for startup context"}</small></div></div><h2>{String(latestStrategy?.summary ?? "Complete startup setup, then create a campaign to generate your first evidence-aware growth plan.")}</h2><p>{String(latestStrategy?.message ?? "MarketPilot will use your audience, offer, voice, and objective without inventing customers, results, or product claims.")}</p><div className="brief-actions"><button onClick={() => setActive(latestStrategy ? "Campaigns" : "Setup")}>{latestStrategy ? "Open campaign →" : "Complete setup →"}</button><span>Human approval enforced</span></div></article><article className="performance-card"><div className="card-head"><div><b>Operational readiness</b><small>Live backend records</small></div></div><div className="readiness-list"><p><span>Business context</span><b>{profile.description && profile.audience ? "Ready" : "Needs setup"}</b></p><p><span>Social connections</span><b>{data.integrations.filter((item) => item.status === "connected").length}/4</b></p><p><span>Brevo delivery</span><b>{data.integrations.find((item) => item.provider === "brevo")?.status === "ready" ? "Ready" : "Needs key"}</b></p><p><span>Approval policy</span><b>Manual</b></p></div></article></div><div className="two-column"><section className="panel"><div className="panel-head"><div><h2>Campaigns</h2><p>Saved in PostgreSQL or local SQLite</p></div><button onClick={() => setActive("Campaigns")}>View all →</button></div><CampaignList /></section><section className="panel"><div className="panel-head"><div><h2>Content queue</h2><p>Nothing publishes without approval</p></div><button onClick={() => setActive("Content")}>Review →</button></div><ContentList /></section></div></>}
          {active === "Campaigns" && <section className="panel full-panel"><div className="panel-head"><div><h2>All campaigns</h2><p>{data.campaigns.length} persistent programs</p></div><button className="button button-primary" onClick={() => setShowComposer(true)}>＋ Create campaign</button></div><CampaignList /></section>}
          {active === "Content" && <section className="panel full-panel"><div className="panel-head"><div><h2>Approval and publishing queue</h2><p>Review → approve → explicitly publish</p></div><button className="button button-primary" onClick={() => setShowComposer(true)}>✦ Generate campaign content</button></div><ContentList /></section>}
          {active === "SEO" && <div className="seo-layout"><article className="seo-score"><div className="score-ring"><strong>{seoResult?.score ?? "—"}</strong><small>/ 100</small></div><h2>{seoResult ? "Latest real audit" : "Website not audited"}</h2><p>Checks metadata, headings, canonical, mobile setup, images, links, and schema.</p><div className="seo-run"><input value={seoUrl} onChange={(event) => setSeoUrl(event.target.value)} placeholder="https://your-site.com"/><button disabled={busy || !seoUrl} onClick={() => void run(async () => { const result = await api.auditSeo(seoUrl); setSeoResult(result); notify("Live SEO audit completed"); })}>Run audit</button></div></article><section className="panel seo-issues"><div className="panel-head"><div><h2>Priority opportunities</h2><p>Measured directly from the audited page</p></div></div>{!seoResult?.issues.length ? <Empty text="Run an audit to see verified issues."/> : seoResult.issues.map((issue, index) => <article key={`${issue.issue}-${index}`}><span>{index + 1}</span><div><b>{issue.issue}</b><small>{issue.impact}</small></div><em>Verified</em><button title={issue.fix}>Fix →</button></article>)}</section></div>}
          {active === "Leads" && <section className="panel full-panel"><div className="panel-head"><div><h2>Consent-aware leads</h2><p>Brevo follow-up is blocked unless consent is recorded</p></div></div><div className="lead-table"><div className="table-head"><span>Contact</span><span>Source</span><span>AI score</span><span>Stage</span><span>Next action</span></div>{data.leads.length === 0 ? <Empty text="No leads yet. The API is ready for your forms and imports."/> : data.leads.map((lead) => <article key={lead.id}><div className="lead-person"><i>{lead.initials}</i><span><b>{lead.name}</b><small>{lead.company || lead.email}</small></span></div><span>{lead.source}</span><div className="lead-score"><i style={{ width: `${lead.score}%` }} /><b>{lead.score}</b></div><span className="lead-stage">{lead.stage}</span><button disabled={busy || !lead.consent} title={lead.consent ? "Send via Brevo" : "Email consent not recorded"} onClick={() => void run(async () => { await api.followUp(lead.id); notify(`Follow-up sent to ${lead.name}`); })}>{lead.consent ? "Send follow-up →" : "Consent required"}</button></article>)}</div></section>}
          {active === "Analytics" && <div className="analytics-layout"><article className="analytics-hero"><span>Recorded growth operations</span><strong>{data.campaigns.length + data.content.length + data.leads.length}</strong><em>Real records—not estimated revenue</em><div className="bar-chart">{[data.campaigns.length, data.content.length, data.leads.length, qualified, data.metrics.approved_content, data.metrics.connected_channels].map((value, index) => <i key={index} style={{height:`${Math.max(8, Math.min(100, value * 12))}%`}} />)}</div></article><section className="panel channel-table"><div className="panel-head"><div><h2>System activity</h2><p>Current persisted totals</p></div></div>{[["Campaigns",data.campaigns.length],["Content drafts",data.content.length],["Leads",data.leads.length],["Qualified leads",qualified],["Connected services",data.metrics.connected_channels]].map(([label,value]) => <article key={label}><b>{label}</b><span>{value}</span><em>Live</em></article>)}</section></div>}
          {active === "Setup" && <div className="setup-layout"><section className="panel setup-form"><div className="panel-head"><div><h2>Business knowledge</h2><p>This context grounds every AI plan and draft</p></div></div>{Object.entries(profile).map(([key, value]) => <label key={key}><span>{key.replaceAll("_", " ")}</span>{["description","audience","offer"].includes(key) ? <textarea value={value} onChange={(event) => setProfile((current) => ({...current,[key]:event.target.value}))}/> : <input value={value} onChange={(event) => setProfile((current) => ({...current,[key]:event.target.value}))}/>}</label>)}<button className="button button-primary" disabled={busy} onClick={() => void run(async () => { const saved = await api.updateProfile(profile); setProfile(saved); notify("Startup knowledge saved"); })}>Save startup profile</button></section><section className="connections-grid"><h2>Connections</h2>{data.integrations.map((item) => <article key={item.provider}><span>{providerLabels[item.provider]?.slice(0,2)}</span><div><b>{providerLabels[item.provider]}</b><small>{item.account_name || (item.configured ? "Credentials ready" : "Add Render environment variables")}</small></div><em className={`connection-${item.status}`}>{item.status.replaceAll("_", " ")}</em><button disabled={busy || item.status === "connected" || item.status === "ready"} onClick={() => void connect(item.provider)}>{item.status === "connected" || item.status === "ready" ? "Connected" : "Connect"}</button></article>)}</section></div>}
        </section></main>
      {showComposer && <div className="modal-backdrop" onMouseDown={() => setShowComposer(false)}><div className="modal" onMouseDown={(event) => event.stopPropagation()}><span className="ai-orb">✦</span><button className="modal-close" onClick={() => setShowComposer(false)}>×</button><small>AI campaign builder</small><h2>What do you want to achieve?</h2><p>The backend will create a saved strategy and separate drafts for X, LinkedIn, Instagram, and Reddit.</p><input autoFocus value={campaignName} onChange={(event) => setCampaignName(event.target.value)} placeholder="Campaign name"/><textarea value={campaignObjective} onChange={(event) => setCampaignObjective(event.target.value)} placeholder="Specific business objective"/><div><button className="button button-ghost" onClick={() => setShowComposer(false)}>Cancel</button><button className="button button-primary" disabled={busy} onClick={() => void createCampaign()}>{busy ? "Building…" : "Build campaign →"}</button></div></div></div>}
      {notice && <div className="toast"><span>✓</span>{notice}</div>}
    </div>
  );
}

function Empty({ text }: { text: string }) { return <div className="empty-state"><span>✦</span><p>{text}</p></div>; }
function Metric({ icon, accent, label, value, note }: { icon: string; accent: string; label: string; value: number; note: string }) { return <article><span className={`metric-icon ${accent}`}>{icon}</span><small>{label}</small><strong>{value}</strong><em>Live</em><p>{note}</p></article>; }
