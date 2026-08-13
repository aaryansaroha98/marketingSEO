"use client";

import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const body = await response.json().catch(() => ({})) as { detail?: string };
      if (!response.ok) throw new Error(body.detail || "Login failed");
      window.location.assign("/app");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return <main className="login-shell"><section className="login-card">
    <a className="wordmark" href="/"><span className="brand-mark">M</span> marketpilot<span>.ai</span></a>
    <small>Private owner workspace</small><h1>Sign in to MarketPilot</h1>
    <p>Provider credentials and publishing controls are protected behind this session.</p>
    {error && <div className="login-error">{error}</div>}
    <form onSubmit={(event) => void login(event)}><label><span>Owner password</span><input autoFocus type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label><button className="button button-primary" disabled={busy || !password}>{busy ? "Signing in…" : "Sign in"}</button></form>
  </section></main>;
}
