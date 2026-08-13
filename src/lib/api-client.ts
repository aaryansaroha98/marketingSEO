import type { Activity, Analytics, BrandProfile, Campaign, ContentItem, Integration, Lead, SearchResults, SeoResult } from "./types";

export type DashboardData = {
  campaigns: Campaign[];
  content: ContentItem[];
  leads: Lead[];
  integrations: Integration[];
  activity: Activity[];
  metrics: Record<string, number>;
};

function errorMessage(body: unknown): string {
  if (!body || typeof body !== "object") return "Request failed";
  const detail = (body as { detail?: unknown }).detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((item) => typeof item === "object" && item && "msg" in item ? String(item.msg) : String(item)).join(", ");
  return "Request failed";
}

async function request<T>(path: string, init?: RequestInit, allowRetry = true): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/backend${path}`, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  } catch {
    throw new Error("The server could not be reached. Check system status and retry.");
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  let body: unknown = {};
  try { body = text ? JSON.parse(text) : {}; }
  catch { body = text ? { detail: text } : {}; }
  const method = init?.method ?? "GET";
  if (!response.ok && allowRetry && method === "GET" && response.status >= 500) {
    await new Promise((resolve) => window.setTimeout(resolve, 2500));
    return request<T>(path, init, false);
  }
  if (!response.ok) throw new Error(errorMessage(body));
  return body as T;
}

export const api = {
  dashboard: () => request<DashboardData>("/v1/dashboard"),
  analytics: () => request<Analytics>("/v1/analytics"),
  search: (query: string) => request<SearchResults>(`/v1/search?q=${encodeURIComponent(query)}`),
  health: async () => {
    const response = await fetch("/api/health", { cache: "no-store" });
    return response.json() as Promise<{ status: string; backend: string; timestamp: string }>;
  },
  profile: () => request<BrandProfile>("/v1/profile"),
  updateProfile: (profile: Omit<BrandProfile, "id" | "updated_at">) => request<BrandProfile>("/v1/profile", { method: "PUT", body: JSON.stringify(profile) }),
  createCampaign: (name: string, objective: string) => request<Campaign>("/v1/campaigns", { method: "POST", body: JSON.stringify({ name, objective, channels: ["linkedin", "x", "instagram", "reddit"] }) }),
  updateCampaign: (id: string, changes: Partial<Pick<Campaign, "name" | "objective" | "status">>) => request<Campaign>(`/v1/campaigns/${id}`, { method: "PATCH", body: JSON.stringify(changes) }),
  deleteCampaign: (id: string) => request<void>(`/v1/campaigns/${id}`, { method: "DELETE" }),
  updateContent: (id: string, changes: Partial<Pick<ContentItem, "title" | "body" | "media_url">>) => request<ContentItem>(`/v1/content/${id}`, { method: "PATCH", body: JSON.stringify(changes) }),
  deleteContent: (id: string) => request<void>(`/v1/content/${id}`, { method: "DELETE" }),
  approveContent: (id: string) => request<ContentItem>(`/v1/content/${id}/approve`, { method: "PATCH" }),
  publishContent: (id: string, media_url = "", subreddit = "") => request<ContentItem>(`/v1/content/${id}/publish`, { method: "POST", body: JSON.stringify({ media_url, subreddit }) }),
  createLead: (lead: Pick<Lead, "name" | "email" | "company" | "source" | "score" | "stage" | "consent">) => request<Lead>("/v1/leads", { method: "POST", body: JSON.stringify(lead) }),
  updateLead: (id: string, changes: Partial<Pick<Lead, "name" | "email" | "company" | "source" | "score" | "stage" | "consent">>) => request<Lead>(`/v1/leads/${id}`, { method: "PATCH", body: JSON.stringify(changes) }),
  deleteLead: (id: string) => request<void>(`/v1/leads/${id}`, { method: "DELETE" }),
  followUp: (id: string) => request<{ status: string; subject: string }>(`/v1/leads/${id}/follow-up`, { method: "POST" }),
  connect: (provider: string) => request<{ authorization_url: string }>(`/v1/integrations/${provider}/connect`, { method: "POST" }),
  disconnect: (provider: string) => request<{ status: string }>(`/v1/integrations/${provider}`, { method: "DELETE" }),
  auditSeo: (url: string) => request<SeoResult>("/v1/seo/audit", { method: "POST", body: JSON.stringify({ url }) }),
  latestSeo: () => request<SeoResult | null>("/v1/seo/latest"),
};
