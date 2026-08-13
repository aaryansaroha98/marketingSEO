import { NextResponse } from "next/server";

export async function GET() {
  const backendUrl = process.env.RENDER_API_URL ?? "http://localhost:8000";
  let backend = "unavailable";
  try {
    const response = await fetch(`${backendUrl.replace(/\/$/, "")}/health`, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    backend = response.ok ? "ok" : "degraded";
  } catch {
    backend = "unavailable";
  }
  return NextResponse.json({ service: "marketpilot-web", status: backend === "ok" ? "ok" : "degraded", backend, timestamp: new Date().toISOString() }, { status: backend === "ok" ? 200 : 503 });
}
