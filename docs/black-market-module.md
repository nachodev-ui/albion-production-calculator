# Black Market Analytics

Black Market Analytics is a dedicated top-level Pro workspace, separate from the crafting and refining calculators.

## Access control

The browser uses the `black_market.analytics` entitlement to present the locked or unlocked experience. That visual gate is not the security boundary: every analysis request is also authenticated and authorized by the central API. Free accounts receive `false`; Pro accounts receive `true` from the production entitlement tables.

## Data model

The module compares:

- the lowest observed sell order in a selected regular market;
- the highest observed buy order in Albion Online's Black Market;
- optional user-entered sale expectations when the central database has no recent Black Market capture;
- observed Black Market history buckets for the selected item, quality and server.

The specialized API keeps the Black Market outside the generic public market catalog. Internally, it reads the Black Market location mapping used by the ingest data and never exposes it as a normal purchase city.

## Calculations

The API calculates purchase cost, gross revenue, sales tax, transport cost, net revenue, profit, profit per unit, margin, return on cost and break-even sale price. It also returns data freshness and history warnings.

The result is analytical, not a guarantee. Orders can change while the player travels to Caerleon, and historical volume does not guarantee that a new lot will sell at the same price or speed.

## Local workspace

The selected item, enchantment, server, source market, quality, quantity, manual sale price, tax, transport and history range are stored in versioned browser storage. Corrupt or unsupported data falls back to safe defaults.
