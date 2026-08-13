export type Campaign = {
  id: string;
  name: string;
  objective: string;
  channel: string;
  channels: string[];
  status: "Live" | "Draft" | "Review" | "Completed";
  progress: number;
  leads: number;
  accent: string;
  strategy: Record<string, unknown>;
  created_at: string;
};

export type ContentItem = {
  id: string;
  campaign_id: string | null;
  type: string;
  title: string;
  body: string;
  time: string;
  state: string;
  media_url: string;
  external_id: string;
  created_at: string;
};

export type Lead = {
  id: string;
  name: string;
  email: string;
  company: string;
  source: string;
  score: number;
  stage: string;
  initials: string;
  consent: boolean;
  created_at: string;
};

export type AiStatus = {
  provider: string;
  status: "configured" | "not_configured";
  configured: boolean;
  model: string;
  fallback_enabled: boolean;
};

export type AiTestResult = {
  provider: string;
  status: "ok";
  model: string;
  message: string;
};

export type Integration = {
  provider: "x" | "linkedin" | "instagram" | "reddit" | "brevo";
  status: string;
  configured: boolean;
  account_name: string;
};

export type BrandProfile = {
  id: string;
  startup_name: string;
  website: string;
  description: string;
  audience: string;
  offer: string;
  voice: string;
  updated_at: string;
};

export type SeoResult = {
  id?: string;
  url?: string;
  score: number;
  issues: Array<{ issue: string; impact: string; fix: string }>;
  details?: Record<string, unknown>;
};

export type Activity = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  detail: Record<string, unknown>;
  created_at: string;
};

export type SearchResults = {
  campaigns: Campaign[];
  content: ContentItem[];
  leads: Lead[];
};

export type Analytics = {
  totals: Record<string, number>;
  content_by_platform: Record<string, number>;
  actions: Record<string, number>;
};
