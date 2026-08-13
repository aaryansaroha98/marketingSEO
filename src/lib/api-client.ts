import type { BrandProfile, Campaign, ContentItem, Integration, Lead, SeoResult } from "./types";

export type DashboardData = {
  campaigns: Campaign[];
  content: ContentItem[];
  leads: Lead[];
  integrations: Integration[];
  metrics: { campaigns: number; qualified_leads: number; approved_content: number; connected_channels: number };
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/backend${path}`, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail ?? body.error ?? "Request failed");
  return body as T;
}

export const api = {
  dashboard: () => request<DashboardData>("/v1/dashboard"),
  profile: () => request<BrandProfile>("/v1/profile"),
  updateProfile: (profile: Omit<BrandProfile, "id" | "updated_at">) => request<BrandProfile>("/v1/profile", { method: "PUT", body: JSON.stringify(profile) }),
  createCampaign: (name: string, objective: string) => request<Campaign>("/v1/campaigns", { method: "POST", body: JSON.stringify({ name, objective, channels: ["linkedin", "x", "instagram", "reddit"] }) }),
  approveContent: (id: string) => request<ContentItem>(`/v1/content/${id}/approve`, { method: "PATCH" }),
  publishContent: (id: string, media_url = "", subreddit = "") => request<ContentItem>(`/v1/content/${id}/publish`, { method: "POST", body: JSON.stringify({ media_url, subreddit }) }),
  followUp: (id: string) => request<{ status: string; subject: string }>(`/v1/leads/${id}/follow-up`, { method: "POST" }),
  connect: (provider: string) => request<{ authorization_url: string }>(`/v1/integrations/${provider}/connect`, { method: "POST" }),
  auditSeo: (url: string) => request<SeoResult>("/v1/seo/audit", { method: "POST", body: JSON.stringify({ url }) }),
  latestSeo: () => request<SeoResult | null>("/v1/seo/latest"),
};
