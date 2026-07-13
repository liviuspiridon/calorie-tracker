# feature: apple-health

Everything Apple Health lives here: the provider adapter, sync logic, and any
UI specific to this integration (connect flow, sync status).

Status: **scaffold only** — `AppleHealthProvider` in `types.ts` is the contract
the adapter must implement. No business logic yet.

Suggested layout as it grows:

```
apple-health/
├── components/   # connect card, sync status
├── server/       # API route handlers / server actions receiving pushed data
├── lib/          # export.xml parser or bridge client
└── types.ts      # the port (already here)
```

Rule: nothing outside this folder imports HealthKit-shaped data. Map to the
shared `MetricSample` type at this boundary.
