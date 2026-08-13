"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { api, type DashboardData } from "@/lib/api-client";
import type { AiStatus, Analytics, Campaign, ContentItem, Lead, SearchResults, SeoResult } from "@/lib/types";

const nav = ["Overview", "Campaigns", "Content", "SEO", "Leads", "Analytics", "AI Settings", "Setup"];
const icons: Record<string, string> = { Overview: "⌘", Campaigns: "◫", Content: "✦", SEO: "⌁", Leads: "♙", Analytics: "⌇", "AI Settings": "◇", Setup: "⚙" };
const providerLabels: Record<string, string> = { x: "X", linkedin: "LinkedIn", instagram: "Instagram", reddit: "Reddit", brevo: "Brevo Mail" };
const blankDashboard: DashboardData = { campaigns: [], content: [], leads: [], integrations: [], activity: [], metrics: { campaigns: 0, leads: 0, content: 0, qualified_leads: 0, approved_content: 0, connected_channels: 0 } };
const blankAnalytics: Analytics = { totals: {}, content_by_platform: {}, actions: {} };
const blankProfile = { startup_name: "My startup", website: "", description: "", audience: "", offer: "", voice: "Clear, credible, useful" };
const blankLead = { name: "", email: "", company: "", source: "Direct", score: 50, stage: "New", consent: false };

type ProfileForm = typeof blankProfile;
type LeadForm = typeof blankLead;
type Health = { status: string; backend: string; timestamp: string };

export function MarketingConsole() {
  const [active, setActive] = useState("Overview");
  const [data, setData] = useState<DashboardData>(blankDashboard);
  const [analytics, setAnalytics] = useState<Analytics>(blankAnalytics);
  const [profile, setProfile] = useState<ProfileForm>(blankProfile);
  const [seoResult, setSeoResult] = useState<SeoResult | null>(null);
  const [seoUrl, setSeoUrl] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [showComposer, setShowComposer] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [campaignObjective, setCampaignObjective] = useState("Generate qualified conversations for my startup");
  const [campaignModal, setCampaignModal] = useState<Campaign | null>(null);
  const [contentModal, setContentModal] = useState<ContentItem | null>(null);
  const [leadModal, setLeadModal] = useState<LeadForm | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [seoIssue, setSeoIssue] = useState<SeoResult["issues"][number] | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [subreddit, setSubreddit] = useState("");

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [showHealth, setShowHealth] = useState(false);
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [aiTestMessage, setAiTestMessage] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const dashboardResult = await api.dashboard();
      setData({ ...dashboardResult, activity: dashboardResult.activity ?? [], metrics: dashboardResult.metrics ?? {} });
      try { setAnalytics(await api.analytics()); } catch { setAnalytics(blankAnalytics); }
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Backend unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await refresh();
      const [profileResult, seoHistoryResult, aiStatusResult] = await Promise.allSettled([api.profile(), api.latestSeo(), api.aiStatus()]);
      if (profileResult.status === "fulfilled") {
        const value = profileResult.value;
        setProfile({ startup_name: value.startup_name, website: value.website, description: value.description, audience: value.audience, offer: value.offer, voice: value.voice });
        setSeoUrl(value.website);
      }
      if (seoHistoryResult.status === "fulfilled") setSeoResult(seoHistoryResult.value);
      if (aiStatusResult.status === "fulfilled") setAiStatus(aiStatusResult.value);
    })();
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const failed = params.get("integration_error");
    if (connected) notify(`${providerLabels[connected] ?? connected} connected`);
    if (failed) setError(`${providerLabels[failed] ?? failed} authorization was cancelled or failed`);
  }, [refresh]);

  function notify(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3000);
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try { await action(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Action failed"); }
    finally { setBusy(false); }
  }

  async function createCampaign() {
    if (!campaignName.trim()) return;
    await run(async () => {
      const campaign = await api.createCampaign(campaignName.trim(), campaignObjective.trim());
      await refresh();
      setCampaignName("");
      setShowComposer(false);
      setActive("Campaigns");
      notify(campaign.strategy.generated_by === "ai" ? "AI campaign and channel drafts created" : "Rule-based campaign and channel drafts created");
    });
  }

  async function submitSearch(event: FormEvent) {
    event.preventDefault();
    if (query.trim().length < 2) { setSearchResults(null); return; }
    await run(async () => setSearchResults(await api.search(query.trim())));
  }

  async function checkHealth() {
    await run(async () => { setHealth(await api.health()); setShowHealth(true); });
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/login");
  }

  function openLead(lead?: Lead) {
    setLeadId(lead?.id ?? null);
    setLeadModal(lead ? { name: lead.name, email: lead.email, company: lead.company, source: lead.source, score: lead.score, stage: lead.stage, consent: lead.consent } : { ...blankLead });
    setDeleteConfirm("");
  }

  async function saveLead() {
    if (!leadModal) return;
    await run(async () => {
      if (leadId) await api.updateLead(leadId, leadModal);
      else await api.createLead(leadModal);
      setLeadModal(null);
      await refresh();
      notify(leadId ? "Lead updated" : "Lead created");
    });
  }

  async function primaryContentAction(item: ContentItem) {
    if (item.state === "Review" || item.state === "Draft") {
      await run(async () => { await api.approveContent(item.id); await refresh(); notify("Content approved; publishing still requires confirmation"); });
    } else if (item.state === "Approved") {
      setContentModal({ ...item });
      setSubreddit("");
      setDeleteConfirm("");
    } else {
      setContentModal({ ...item });
    }
  }

  async function connect(provider: string) {
    await run(async () => { const result = await api.connect(provider); window.location.assign(result.authorization_url); });
  }

  const contentCounts = useMemo(() => {
    const counts: Record<string, Record<string, number>> = {};
    for (const item of data.content) {
      if (!item.campaign_id) continue;
      counts[item.campaign_id] ??= {};
      counts[item.campaign_id][item.state] = (counts[item.campaign_id][item.state] ?? 0) + 1;
    }
    return counts;
  }, [data.content]);

  const latestStrategy = data.campaigns[0]?.strategy;
  const titles: Record<string, [string, string]> = {
    Overview: [`${profile.startup_name} growth command`, "Live persisted activity from campaigns, search, channels, and leads."],
    Campaigns: ["Campaign engine", "Create, inspect, edit, change status, and remove growth programs."],
    Content: ["Content studio", "Edit every draft, approve it, and explicitly publish through connected accounts."],
    SEO: ["Search intelligence", "Audit your website and open actionable guidance for every verified issue."],
    Leads: ["Lead pipeline", "Create, qualify, update, and follow up with consent-aware contacts."],
    Analytics: ["Activity analytics", "Database-backed inventory, channel output, and action history."],
    "AI Settings": ["AI provider settings", "Verify the server-side model connection without exposing credentials."],
    Setup: ["Startup setup", "Control business context and approved provider connections."],
  };

  const CampaignList = () => (
    <div className="campaign-list">
      {data.campaigns.length === 0 ? <Empty text="No campaigns yet. Create your first focused growth campaign." /> : data.campaigns.map((campaign) => {
        const counts = contentCounts[campaign.id] ?? {};
        return <article className="campaign-row campaign-row-real" key={campaign.id}>
          <span className={`campaign-icon ${campaign.accent}`}>✦</span>
          <button className="campaign-name row-link" onClick={() => { setCampaignModal({ ...campaign }); setDeleteConfirm(""); }}><b>{campaign.name}</b><small>{campaign.objective}</small></button>
          <span className={`status status-${campaign.status.toLowerCase()}`}>{campaign.status}</span>
          <div className="record-summary"><b>{data.content.filter((item) => item.campaign_id === campaign.id).length}</b><small>drafts</small></div>
          <div className="record-summary"><b>{(counts.Approved ?? 0) + (counts.Published ?? 0)}</b><small>approved/live</small></div>
          <button className="icon-button menu-button" onClick={() => { setCampaignModal({ ...campaign }); setDeleteConfirm(""); }} aria-label={`Manage ${campaign.name}`}>•••</button>
        </article>;
      })}
    </div>
  );

  const ContentList = () => (
    <div className="content-list">
      {data.content.length === 0 ? <Empty text="Campaign drafts will appear here for review." /> : data.content.map((item) => <article className="content-row content-row-real" key={item.id}>
        <span className="channel-icon">{item.type.slice(0, 2)}</span>
        <button className="row-link content-title" onClick={() => { setContentModal({ ...item }); setSubreddit(""); setDeleteConfirm(""); }}><small>{item.type}</small><b>{item.title}</b><span>{new Date(item.created_at).toLocaleDateString()}</span></button>
        <span className={`status status-${item.state.toLowerCase()}`}>{item.state}</span>
        <button className="approve-button" disabled={busy} onClick={() => void primaryContentAction(item)}>{item.state === "Published" ? "View" : item.state === "Approved" ? "Review & publish" : "Approve"}</button>
        <button className="icon-button menu-button" onClick={() => { setContentModal({ ...item }); setSubreddit(""); setDeleteConfirm(""); }} aria-label={`Manage ${item.title}`}>•••</button>
      </article>)}
    </div>
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="wordmark sidebar-logo" href="/"><span className="brand-mark">M</span> marketpilot<span>.ai</span></Link>
        <nav className="side-nav"><small>Workspace</small>{nav.map((item) => <button className={active === item ? "active" : ""} onClick={() => setActive(item)} key={item}><span>{icons[item]}</span>{item}{item === "Content" && data.content.length > 0 && <em>{data.content.length}</em>}</button>)}</nav>
        <div className="connected"><div className="connected-title"><span>Connected services</span><b>{data.metrics.connected_channels ?? 0}</b></div><div className="channel-stack">{data.integrations.slice(0, 5).map((item) => <i key={item.provider}>{item.provider.slice(0, 2)}</i>)}</div><small><span className="live-dot" /> {error ? "Service needs attention" : "Backend responding"}</small></div>
        <div className="user-card"><span>ME</span><div><b>Owner workspace</b><small>Private signed session</small></div><button onClick={() => void logout()}>Log out</button></div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <form className="search" onSubmit={(event) => void submitSearch(event)}><span>⌕</span><input aria-label="Search workspace" value={query} onChange={(event) => { setQuery(event.target.value); if (!event.target.value) setSearchResults(null); }} placeholder="Search campaigns, content, leads..." /></form>
          <div className="top-actions"><button className="top-icon" onClick={() => void checkHealth()} aria-label="Check system status">●<i /></button><button className="button button-dark" onClick={() => setShowComposer(true)}>＋ New campaign</button></div>
          {searchResults && <SearchPanel results={searchResults} onClose={() => setSearchResults(null)} onCampaign={(item) => { setCampaignModal({ ...item }); setSearchResults(null); }} onContent={(item) => { setContentModal({ ...item }); setSearchResults(null); }} onLead={(item) => { openLead(item); setSearchResults(null); }} />}
          {showHealth && health && <div className="status-popover"><button onClick={() => setShowHealth(false)}>×</button><b>System status</b><p><span>Web application</span><em>{health.status}</em></p><p><span>Render backend</span><em>{health.backend}</em></p><small>Checked {new Date(health.timestamp).toLocaleTimeString()}</small></div>}
        </header>

        <section className="workspace-body">
          {error && <div className="error-banner"><b>Action needed:</b> {error}<button onClick={() => void refresh()}>Retry</button></div>}
          {loading && <div className="loading-bar" />}
          <div className="page-heading"><div><span className="overline">Persisted growth workspace</span><h1>{titles[active][0]}</h1><p>{titles[active][1]}</p></div><button className="date-control" disabled={loading} onClick={() => void refresh()}>Refresh ↻</button></div>

          {active === "Overview" && <>
            <div className="metric-grid"><Metric icon="◫" accent="violet" label="Campaigns" value={data.metrics.campaigns ?? 0} note="database total"/><Metric icon="♙" accent="cyan" label="Qualified leads" value={data.metrics.qualified_leads ?? 0} note="score of 80 or more"/><Metric icon="✦" accent="lime" label="Approved content" value={data.metrics.approved_content ?? 0} note="approved or published"/><Metric icon="◎" accent="orange" label="Connected services" value={data.metrics.connected_channels ?? 0} note="provider-ready"/></div>
            <div className="insight-grid"><article className="ai-brief"><div className="brief-head"><span className="ai-orb">✦</span><div><b>Latest campaign intelligence</b><small>{latestStrategy ? `Generated by ${String(latestStrategy.generated_by ?? "rules")}` : "Waiting for startup context"}</small></div></div><h2>{String(latestStrategy?.summary ?? "Complete startup setup, then create a campaign to generate your first evidence-aware growth plan.")}</h2><p>{String(latestStrategy?.message ?? "MarketPilot uses your audience, offer, voice, and objective without inventing customers or results.")}</p><div className="brief-actions"><button onClick={() => setActive(latestStrategy ? "Campaigns" : "Setup")}>{latestStrategy ? "Open campaigns →" : "Complete setup →"}</button><span>Manual approval enforced</span></div></article><article className="performance-card"><div className="card-head"><div><b>Operational readiness</b><small>Current provider and profile state</small></div></div><div className="readiness-list"><p><span>Business context</span><b>{profile.description && profile.audience ? "Ready" : "Needs setup"}</b></p><p><span>Social connections</span><b>{data.integrations.filter((item) => item.status === "connected").length}/4</b></p><p><span>Brevo delivery</span><b>{data.integrations.find((item) => item.provider === "brevo")?.status === "ready" ? "Ready" : "Needs key + sender"}</b></p><p><span>Publishing policy</span><b>Manual approval</b></p></div></article></div>
            <div className="two-column"><section className="panel"><div className="panel-head"><div><h2>Campaigns</h2><p>Latest persisted programs</p></div><button onClick={() => setActive("Campaigns")}>View all →</button></div><CampaignList /></section><section className="panel"><div className="panel-head"><div><h2>Content queue</h2><p>Review and publishing state</p></div><button onClick={() => setActive("Content")}>Review →</button></div><ContentList /></section></div>
          </>}

          {active === "Campaigns" && <section className="panel full-panel"><div className="panel-head"><div><h2>All campaigns</h2><p>{data.metrics.campaigns ?? 0} saved programs</p></div><button className="button button-primary" onClick={() => setShowComposer(true)}>＋ Create campaign</button></div><CampaignList /></section>}
          {active === "Content" && <section className="panel full-panel"><div className="panel-head"><div><h2>Approval and publishing queue</h2><p>Edit → approve → confirm provider publish</p></div><button className="button button-primary" onClick={() => setShowComposer(true)}>✦ Create campaign drafts</button></div><ContentList /></section>}

          {active === "SEO" && <div className="seo-layout"><article className="seo-score"><div className="score-ring"><strong>{seoResult?.score ?? "—"}</strong><small>/ 100</small></div><h2>{seoResult ? "Latest verified audit" : "Website not audited"}</h2><p>Checks metadata, headings, canonical, mobile setup, images, links, and schema.</p><div className="seo-run"><input value={seoUrl} onChange={(event) => setSeoUrl(event.target.value)} placeholder="https://your-site.com"/><button disabled={busy || !seoUrl} onClick={() => void run(async () => { const result = await api.auditSeo(seoUrl); setSeoResult(result); notify("Live SEO audit completed"); })}>Run audit</button></div></article><section className="panel seo-issues"><div className="panel-head"><div><h2>Priority opportunities</h2><p>Open each issue for verified remediation guidance</p></div></div>{!seoResult?.issues.length ? <Empty text="Run an audit to see verified issues."/> : seoResult.issues.map((issue, index) => <article key={`${issue.issue}-${index}`}><span>{index + 1}</span><div><b>{issue.issue}</b><small>{issue.impact}</small></div><em>Verified</em><button onClick={() => setSeoIssue(issue)}>Open fix →</button></article>)}</section></div>}

          {active === "Leads" && <section className="panel full-panel"><div className="panel-head"><div><h2>Consent-aware leads</h2><p>Create and qualify contacts; Brevo sending requires consent</p></div><button className="button button-primary" onClick={() => openLead()}>＋ Add lead</button></div><div className="lead-table"><div className="table-head"><span>Contact</span><span>Source</span><span>Qualification</span><span>Stage</span><span>Actions</span></div>{data.leads.length === 0 ? <Empty text="No leads yet. Add a consent-aware contact to begin."/> : data.leads.map((lead) => <article key={lead.id}><button className="lead-person row-link" onClick={() => openLead(lead)}><i>{lead.initials}</i><span><b>{lead.name}</b><small>{lead.company || lead.email}</small></span></button><span>{lead.source}</span><div className="lead-score"><i style={{ width: `${lead.score}%` }} /><b>{lead.score}</b></div><span className="lead-stage">{lead.stage}</span><div className="lead-actions"><button onClick={() => openLead(lead)}>Edit</button><button disabled={busy || !lead.consent} title={lead.consent ? "Send via Brevo" : "Consent not recorded"} onClick={() => void run(async () => { await api.followUp(lead.id); notify(`Follow-up sent to ${lead.name}`); })}>{lead.consent ? "Email" : "No consent"}</button></div></article>)}</div></section>}

          {active === "Analytics" && <div className="analytics-layout"><section className="panel analytics-summary"><div className="panel-head"><div><h2>Persisted inventory</h2><p>Exact database counts</p></div></div>{Object.entries(analytics.totals).map(([label, value]) => <article key={label}><span>{label.replaceAll("_", " ")}</span><strong>{value}</strong></article>)}<div className="platform-breakdown"><h3>Content by channel</h3>{Object.keys(analytics.content_by_platform).length === 0 ? <p>No channel content yet.</p> : Object.entries(analytics.content_by_platform).map(([platform, value]) => <p key={platform}><span>{platform}</span><b>{value}</b></p>)}</div></section><section className="panel activity-feed"><div className="panel-head"><div><h2>Recent actions</h2><p>Audited backend events</p></div></div>{data.activity.length === 0 ? <Empty text="Actions will appear after you use the workspace."/> : data.activity.map((item) => <article key={item.id}><i>✓</i><div><b>{item.action.replaceAll(".", " ")}</b><small>{item.entity_type} · {new Date(item.created_at).toLocaleString()}</small></div></article>)}</section></div>}

          {active === "AI Settings" && <div className="ai-settings-layout"><section className="panel ai-settings-card"><div className="panel-head"><div><h2>AI connection</h2><p>Server-side credentials from Render</p></div><em className={aiStatus?.configured ? "ai-status-ready" : "ai-status-missing"}>{aiStatus?.status.replaceAll("_", " ") ?? "checking"}</em></div><div className="readiness-list"><p><span>Provider</span><b>{aiStatus?.provider ?? "—"}</b></p><p><span>Model</span><b>{aiStatus?.model ?? "—"}</b></p><p><span>Safe fallback</span><b>{aiStatus?.fallback_enabled ? "Enabled" : "—"}</b></p><p><span>Credential storage</span><b>Render only</b></p></div><div className="ai-settings-actions"><button className="button button-primary" disabled={busy || !aiStatus?.configured} onClick={() => void run(async () => { const result = await api.testAi(); setAiTestMessage(result.message); setAiStatus(await api.aiStatus()); notify("AI connection verified"); })}>{busy ? "Testing…" : "Test AI connection"}</button><button className="button button-ghost" disabled={busy} onClick={() => void run(async () => { setAiStatus(await api.aiStatus()); setAiTestMessage(""); })}>Refresh status</button></div>{aiTestMessage && <div className="ai-test-result">✓ {aiTestMessage}</div>}{!aiStatus?.configured && <div className="ai-config-warning"><b>AI is using the safe rules engine.</b><span>Add AI_API_KEY, AI_BASE_URL, and AI_MODEL to Render, redeploy, then refresh.</span></div>}</section><section className="panel ai-provider-help"><div className="panel-head"><div><h2>Provider configuration</h2><p>Never paste API keys into the browser</p></div></div><div className="provider-options"><article><b>Google Gemini</b><span>Best free starting option</span><code>generativelanguage.googleapis.com/v1beta/openai</code></article><article><b>Groq</b><span>Fast OpenAI-compatible inference</span><code>api.groq.com/openai/v1</code></article><article><b>OpenRouter</b><span>Free-model routing and many models</span><code>openrouter.ai/api/v1</code></article><article><b>OpenAI</b><span>Paid, reliable production option</span><code>api.openai.com/v1</code></article></div><div className="secret-note"><b>Required Render variables</b><code>AI_API_KEY</code><code>AI_BASE_URL</code><code>AI_MODEL</code><small>The API key is never returned by the backend or included in browser JavaScript.</small></div></section></div>}

          {active === "Setup" && <div className="setup-layout"><section className="panel setup-form"><div className="panel-head"><div><h2>Business knowledge</h2><p>Saved context grounds every generated plan and draft</p></div></div>{(["startup_name","website","description","audience","offer","voice"] as const).map((key) => <label key={key}><span>{key.replaceAll("_", " ")}</span>{["description","audience","offer"].includes(key) ? <textarea value={profile[key]} onChange={(event) => setProfile((current) => ({...current,[key]:event.target.value}))}/> : <input value={profile[key]} onChange={(event) => setProfile((current) => ({...current,[key]:event.target.value}))}/>}</label>)}<button className="button button-primary" disabled={busy} onClick={() => void run(async () => { const saved = await api.updateProfile(profile); setProfile({ startup_name: saved.startup_name, website: saved.website, description: saved.description, audience: saved.audience, offer: saved.offer, voice: saved.voice }); notify("Startup knowledge saved"); })}>Save startup profile</button></section><section className="connections-grid"><h2>Connections</h2>{data.integrations.map((item) => <article key={item.provider}><span>{providerLabels[item.provider]?.slice(0,2)}</span><div><b>{providerLabels[item.provider]}</b><small>{item.account_name || (item.configured ? "Credentials ready" : "Add credentials in Render")}</small></div><em className={`connection-${item.status}`}>{item.status.replaceAll("_", " ")}</em>{item.provider === "brevo" && item.status === "ready" ? <button disabled>Configured</button> : item.status === "connected" ? <button className="danger-link" onClick={() => void run(async () => { await api.disconnect(item.provider); await refresh(); notify(`${providerLabels[item.provider]} disconnected`); })}>Disconnect</button> : <button disabled={busy} onClick={() => void connect(item.provider)}>Connect</button>}</article>)}</section></div>}
        </section>
      </main>

      {showComposer && <Modal onClose={() => setShowComposer(false)}><span className="ai-orb">✦</span><small>Campaign builder</small><h2>What do you want to achieve?</h2><p>Creates a saved strategy and channel-specific drafts. The result identifies whether AI or the safe rules engine generated it.</p><input autoFocus value={campaignName} onChange={(event) => setCampaignName(event.target.value)} placeholder="Campaign name"/><textarea value={campaignObjective} onChange={(event) => setCampaignObjective(event.target.value)} placeholder="Specific business objective"/><div className="modal-actions"><button className="button button-ghost" onClick={() => setShowComposer(false)}>Cancel</button><button className="button button-primary" disabled={busy || !campaignName.trim()} onClick={() => void createCampaign()}>{busy ? "Building…" : "Build campaign →"}</button></div></Modal>}

      {campaignModal && <Modal onClose={() => setCampaignModal(null)}><small>Campaign details</small><h2>Edit campaign</h2><label><span>Name</span><input value={campaignModal.name} onChange={(event) => setCampaignModal({...campaignModal,name:event.target.value})}/></label><label><span>Objective</span><textarea value={campaignModal.objective} onChange={(event) => setCampaignModal({...campaignModal,objective:event.target.value})}/></label><label><span>Status</span><select value={campaignModal.status} onChange={(event) => setCampaignModal({...campaignModal,status:event.target.value as Campaign["status"]})}>{["Draft","Review","Live","Completed"].map((value) => <option key={value}>{value}</option>)}</select></label><div className="detail-box"><b>Strategy summary</b><p>{String(campaignModal.strategy.summary ?? "No summary available")}</p><small>{campaignModal.channels.join(" · ")} · generated by {String(campaignModal.strategy.generated_by ?? "rules")}</small></div><div className="modal-actions split-actions"><button className="button danger-button" onClick={() => { if (deleteConfirm === campaignModal.id) void run(async () => { await api.deleteCampaign(campaignModal.id); setCampaignModal(null); await refresh(); notify("Campaign and its drafts deleted"); }); else setDeleteConfirm(campaignModal.id); }}>{deleteConfirm === campaignModal.id ? "Confirm delete" : "Delete"}</button><span/><button className="button button-ghost" onClick={() => setCampaignModal(null)}>Close</button><button className="button button-primary" disabled={busy} onClick={() => void run(async () => { await api.updateCampaign(campaignModal.id,{name:campaignModal.name,objective:campaignModal.objective,status:campaignModal.status}); setCampaignModal(null); await refresh(); notify("Campaign updated"); })}>Save changes</button></div></Modal>}

      {contentModal && <Modal wide onClose={() => setContentModal(null)}><small>{contentModal.type} content</small><h2>{contentModal.state === "Published" ? "Published record" : "Edit and review"}</h2><label><span>Title</span><input disabled={contentModal.state === "Published"} value={contentModal.title} onChange={(event) => setContentModal({...contentModal,title:event.target.value})}/></label><label><span>Body</span><textarea className="content-editor" disabled={contentModal.state === "Published"} value={contentModal.body} onChange={(event) => setContentModal({...contentModal,body:event.target.value})}/></label>{contentModal.type.toLowerCase() === "instagram" && <label><span>Public HTTPS media URL</span><input disabled={contentModal.state === "Published"} value={contentModal.media_url} onChange={(event) => setContentModal({...contentModal,media_url:event.target.value})} placeholder="https://..."/></label>}{contentModal.type.toLowerCase() === "reddit" && contentModal.state === "Approved" && <label><span>Subreddit</span><input value={subreddit} onChange={(event) => setSubreddit(event.target.value)} placeholder="startups"/></label>}{contentModal.external_id && <div className="detail-box"><b>Provider record</b><p>{contentModal.external_id}</p></div>}<div className="modal-actions split-actions">{contentModal.state !== "Published" && <button className="button danger-button" onClick={() => { if (deleteConfirm === contentModal.id) void run(async () => { await api.deleteContent(contentModal.id); setContentModal(null); await refresh(); notify("Draft deleted"); }); else setDeleteConfirm(contentModal.id); }}>{deleteConfirm === contentModal.id ? "Confirm delete" : "Delete"}</button>}<span/>{contentModal.state !== "Published" && <button className="button button-ghost" disabled={busy} onClick={() => void run(async () => { const saved = await api.updateContent(contentModal.id,{title:contentModal.title,body:contentModal.body,media_url:contentModal.media_url}); setContentModal(saved); await refresh(); notify("Content saved and returned to review"); })}>Save draft</button>}{contentModal.state === "Approved" && <button className="button button-primary" disabled={busy || (contentModal.type.toLowerCase() === "instagram" && !contentModal.media_url) || (contentModal.type.toLowerCase() === "reddit" && !subreddit)} onClick={() => void run(async () => { await api.publishContent(contentModal.id,contentModal.media_url,subreddit); setContentModal(null); await refresh(); notify(`Published to ${contentModal.type}`); })}>Confirm publish</button>}<button className="button button-ghost" onClick={() => setContentModal(null)}>Close</button></div></Modal>}

      {leadModal && <Modal onClose={() => setLeadModal(null)}><small>{leadId ? "Lead record" : "New lead"}</small><h2>{leadId ? "Edit lead" : "Add a consent-aware lead"}</h2><div className="form-grid"><label><span>Name</span><input value={leadModal.name} onChange={(event) => setLeadModal({...leadModal,name:event.target.value})}/></label><label><span>Email</span><input type="email" value={leadModal.email} onChange={(event) => setLeadModal({...leadModal,email:event.target.value})}/></label><label><span>Company</span><input value={leadModal.company} onChange={(event) => setLeadModal({...leadModal,company:event.target.value})}/></label><label><span>Source</span><input value={leadModal.source} onChange={(event) => setLeadModal({...leadModal,source:event.target.value})}/></label><label><span>Qualification score</span><input type="number" min="0" max="100" value={leadModal.score} onChange={(event) => setLeadModal({...leadModal,score:Number(event.target.value)})}/></label><label><span>Stage</span><select value={leadModal.stage} onChange={(event) => setLeadModal({...leadModal,stage:event.target.value})}>{["New","Nurturing","Qualified","Sales ready","Won","Lost"].map((value) => <option key={value}>{value}</option>)}</select></label></div><label className="check-label"><input type="checkbox" checked={leadModal.consent} onChange={(event) => setLeadModal({...leadModal,consent:event.target.checked})}/><span>Contact explicitly consented to email communication</span></label><div className="modal-actions split-actions">{leadId && <button className="button danger-button" onClick={() => { if (deleteConfirm === leadId) void run(async () => { await api.deleteLead(leadId); setLeadModal(null); await refresh(); notify("Lead deleted"); }); else setDeleteConfirm(leadId); }}>{deleteConfirm === leadId ? "Confirm delete" : "Delete"}</button>}<span/><button className="button button-ghost" onClick={() => setLeadModal(null)}>Cancel</button><button className="button button-primary" disabled={busy || !leadModal.name || !leadModal.email} onClick={() => void saveLead()}>Save lead</button></div></Modal>}

      {seoIssue && <Modal onClose={() => setSeoIssue(null)}><small>{seoIssue.impact}</small><h2>{seoIssue.issue}</h2><div className="detail-box fix-guidance"><b>Recommended fix</b><p>{seoIssue.fix}</p></div><p className="modal-note">MarketPilot audits the public page but cannot modify an external website without repository access. Apply this change in that site’s code, then run the audit again.</p><div className="modal-actions"><button className="button button-ghost" onClick={() => setSeoIssue(null)}>Close</button><button className="button button-primary" onClick={() => void navigator.clipboard.writeText(seoIssue.fix).then(() => notify("Fix instructions copied"))}>Copy instructions</button></div></Modal>}

      {notice && <div className="toast"><span>✓</span>{notice}</div>}
    </div>
  );
}

function Modal({ children, onClose, wide = false }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><div className={`modal ${wide ? "modal-wide" : ""}`} onMouseDown={(event) => event.stopPropagation()}><button className="modal-close" onClick={onClose}>×</button>{children}</div></div>;
}

function SearchPanel({ results, onClose, onCampaign, onContent, onLead }: { results: SearchResults; onClose: () => void; onCampaign: (item: Campaign) => void; onContent: (item: ContentItem) => void; onLead: (item: Lead) => void }) {
  const total = results.campaigns.length + results.content.length + results.leads.length;
  return <div className="search-panel"><div><b>Search results</b><button onClick={onClose}>×</button></div>{total === 0 ? <p>No matching records.</p> : <>{results.campaigns.map((item) => <button key={item.id} onClick={() => onCampaign(item)}><span>Campaign</span><b>{item.name}</b></button>)}{results.content.map((item) => <button key={item.id} onClick={() => onContent(item)}><span>{item.type}</span><b>{item.title}</b></button>)}{results.leads.map((item) => <button key={item.id} onClick={() => onLead(item)}><span>Lead</span><b>{item.name} · {item.company}</b></button>)}</>}</div>;
}

function Empty({ text }: { text: string }) { return <div className="empty-state"><span>✦</span><p>{text}</p></div>; }
function Metric({ icon, accent, label, value, note }: { icon: string; accent: string; label: string; value: number; note: string }) { return <article><span className={`metric-icon ${accent}`}>{icon}</span><small>{label}</small><strong>{value}</strong><em>Stored</em><p>{note}</p></article>; }
