export type Campaign = {
  id: string;
  name: string;
  objective: string;
  channel: string;
  channels: string[];
  status: "Live" | "Draft" | "Review";
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
