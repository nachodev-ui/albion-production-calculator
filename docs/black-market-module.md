# Black Market module

Dedicated Pro-only workspace for Black Market analytics. The module uses the canonical market catalog, resolves the enabled market with type `black-market`, and reuses the central price/history pipeline. Access is controlled by the server-provided `black_market.analytics` entitlement; the browser gate is presentation only and the API remains the source of truth for account access.
