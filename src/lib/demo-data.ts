export type Campaign = {
  id: number;
  name: string;
  channel: string;
  status: "Live" | "Draft" | "Review";
  progress: number;
  leads: number;
  accent: string;
};

export type Lead = {
  id: number;
  name: string;
  company: string;
  source: string;
  score: number;
  stage: string;
  initials: string;
};

export const campaigns: Campaign[] = [
  { id: 1, name: "Q3 Product Launch", channel: "Multi-channel", status: "Live", progress: 72, leads: 148, accent: "violet" },
  { id: 2, name: "Founder-led Growth", channel: "LinkedIn", status: "Live", progress: 48, leads: 63, accent: "cyan" },
  { id: 3, name: "SEO Topic Authority", channel: "Organic search", status: "Review", progress: 31, leads: 29, accent: "lime" },
];

export const leads: Lead[] = [
  { id: 1, name: "Maya Chen", company: "Vertex Labs", source: "SEO", score: 94, stage: "Sales ready", initials: "MC" },
  { id: 2, name: "Jon Bell", company: "North & Co.", source: "LinkedIn", score: 87, stage: "Qualified", initials: "JB" },
  { id: 3, name: "Amara Shah", company: "Kinship", source: "Webinar", score: 81, stage: "Nurturing", initials: "AS" },
  { id: 4, name: "Luis Ortiz", company: "Brightside", source: "Direct", score: 76, stage: "New", initials: "LO" },
];
