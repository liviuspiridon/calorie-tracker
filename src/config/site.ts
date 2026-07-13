export const siteConfig = {
  name: "Balance",
  description: "Your personal health dashboard.",
  url: "http://localhost:3000",
} as const;

export type SiteConfig = typeof siteConfig;
