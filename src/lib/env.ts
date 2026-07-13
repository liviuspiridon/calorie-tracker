/**
 * Typed access to environment variables.
 *
 * Add validation here (e.g. with zod) as integrations land, so a missing
 * key fails at boot instead of at request time. Keep server-only secrets
 * out of NEXT_PUBLIC_* names.
 */
export const env = {
  // Home Assistant (server-side only — never expose the token to the client)
  HOME_ASSISTANT_URL: process.env.HOME_ASSISTANT_URL,
  HOME_ASSISTANT_TOKEN: process.env.HOME_ASSISTANT_TOKEN,

  // AI meal logging
  AI_API_KEY: process.env.AI_API_KEY,
} as const;
