# feature: home-assistant

Bridge to a Home Assistant instance for health-adjacent home data (air
quality, smart scale, sleep-environment sensors).

Status: **scaffold only** — `HomeAssistantClient` in `types.ts` is the contract.

Implementation notes for later:

- All HA calls go through server code (API routes / server actions); the
  long-lived access token must never reach the browser.
- Map interesting entity states to the shared `MetricSample` type at this
  boundary so the dashboard stays vendor-agnostic.
