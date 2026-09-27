---
title: 'Split food and coffee categories'
type: 'feature'
ticket: ''
created: '2026-09-27'
status: 'built'
baseline_revision: 'f38a31759bdd135bae602185a72f21eb778e1fa3'
route: 'full'
route_source: 'auto'
review: 'thorough'
review_source: 'auto'
lenses_ran: ['blind-hunter', 'edge-case-hunter', 'verification-gap']
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The single `Food & coffee` category combines restaurant spending with coffee and café purchases, so spending views cannot distinguish them.

**Approach:** Replace the `dining` taxonomy entry with distinct `restaurants` and `coffee` categories. Route new classifications and evidence-backed corrections to the appropriate category, and migrate persisted legacy `dining` records to `restaurants` so saved workspaces remain displayable.

## Boundaries & Constraints

**Always:** Keep groceries distinct from both new categories; derive the model’s valid choices from the canonical taxonomy; preserve saved transaction data and no-credit resume behavior; use stable category IDs consistently in API responses, selectors, charts, exports, and cached results.

**Never:** Reclassify a saved user statement by making new model calls; alter unrelated category definitions; discard a saved workspace merely because it uses the retired `dining` ID.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| New restaurant classification | Merchant/bank evidence identifies a restaurant, pub, takeaway, or prepared-food bakery | Result uses `restaurants`; the UI labels and aggregates it as Restaurants | Jev’s existing retry/error path remains unchanged |
| New coffee classification | Merchant/bank evidence identifies a café, coffee shop, or coffee-focused patisserie | Result uses `coffee`; the UI labels and aggregates it as Coffee | Ambiguous merchants retain the existing `other` fallback |
| Restored legacy workspace | Persisted transaction or cache entry has `category: 'dining'` or `initialCategory: 'dining'` | Restore converts those values to `restaurants` before rendering or resuming | Existing encrypted-storage errors remain unchanged |
| Built-in sample | Worker sample contains retired dining values and probability keys | Sample uses only active IDs and remains usable without a live classification request | Fixture generation/validation failure is caught in automated tests |

</frozen-after-approval>

## Code Map

- `categorizer.mjs` -- Canonical taxonomy and the request criteria generated for Jev; replace the retired `dining` definition here.
- `bank.mjs` -- Comparison prompt encodes the bank-category reconciliation policy; distinguish cafés from restaurants and preserve groceries.
- `reviewed.mjs` -- Evidence override for Żona Krawca currently targets `dining`; map its café/patisserie evidence to `coffee`.
- `public/cloud-client.js` and `public/workspace-store.js` -- Restore and cache persisted client-side transactions; migrate legacy category IDs before UI use and keep encrypted workspace behavior intact.
- `worker/index.mjs`, `worker/sample.json`, and `worker/initial-categories.json` -- Worker validates choices from the taxonomy and serves the built-in sample, which must not expose retired taxonomy IDs.
- `categorizer.test.mjs`, `worker.test.mjs`, and browser checks -- Regression coverage for request choices, reconciliation/evidence decisions, saved-data migration, and the sample.
- `README.md` -- Correct the evidence-review description for Żona Krawca.

## Tasks & Acceptance

**Execution:**
- [ ] `categorizer.mjs` and `bank.mjs` -- Define `restaurants` and `coffee` with unambiguous model criteria, and update the comparison policy so cafés/coffee shops resolve to Coffee while restaurants, pubs, takeaway, and prepared-food bakeries resolve to Restaurants.
- [ ] `reviewed.mjs` and `README.md` -- Move the Żona Krawca evidence override to Coffee and update the accompanying explanation.
- [ ] `public/cloud-client.js` and `public/workspace-store.js` -- Add a deterministic legacy-category migration during restore/cache hydration, converting retired `dining` fields and probability entries to `restaurants` without issuing a classification request.
- [ ] `worker/initial-categories.json`, `worker/sample.json`, and Worker-facing checks -- Transform the built-in fixture to active category IDs and synchronized probability maps, while leaving worker choice validation taxonomy-driven.
- [ ] `categorizer.test.mjs`, `worker.test.mjs`, and relevant browser checks -- Cover both new categories, the explicit reconciliation and reviewed paths, legacy migration, and fixture integrity.

**Acceptance Criteria:**
- Given a new classification request, when Jev receives its choices, then `restaurants` and `coffee` are valid options and `dining` is absent.
- Given restaurant and café evidence, when the reconciliation or reviewed path runs, then each result uses Restaurants or Coffee according to the defined policy.
- Given a restored workspace containing legacy `dining` values, when it loads, then all category-dependent UI behavior uses Restaurants without calling Jev.
- Given the Worker’s built-in sample, when it is fetched and rendered, then every category and probability key is in the active taxonomy.

## Implementation Notes

- Replaced the retired taxonomy ID with `restaurants` and `coffee`; legacy records map to Restaurants because their old combined label cannot be split accurately without new inference.
- Migrated local, cloud, and local-server cache hydration. The generated Worker sample remains ignored and is rebuilt from the tracked source fixture during test and deploy preparation.

## Plan Change Log

## Review Triage Log

- blind-hunter: false — legacy fixture and workspace records intentionally map their combined `dining` probability to Restaurants; adding a fabricated Coffee probability or reclassifying historical merchants would violate the frozen no-new-inference constraint.
- blind-hunter: false — fixture coffee-looking merchants are legacy combined records and deliberately retain the deterministic Restaurants migration.
- blind-hunter: false — reviewed overrides take precedence over cached probabilities, so Żona Krawca renders as Coffee without a contradictory active probability key.
- blind-hunter: false — a legacy probability distribution need only contain active IDs; it is not required to include every current category.
- blind-hunter: false — summing a rare mixed legacy record preserves its combined semantic mass; model probability maps are not validated or consumed after persistence.
- blind-hunter: low rejected — restored local snapshots are migrated before every render and resume; persisting the equivalent migration is unnecessary added write complexity.
- blind-hunter: low rejected — local-server cache migration is applied before every hydration; writing ignored cache files without a classification is unnecessary.
- blind-hunter: low rejected — legacy manual overrides are remapped at their only consumer before rendering.
- blind-hunter: false — cloud cache hydration spreads its reduced cached fields over the original transaction, preserving existing probability maps.
- blind-hunter: patch — comparison-request criteria lacked direct coverage; added a regression test for both active IDs and the retired-ID absence.
- blind-hunter: false — sample validation establishes every retained probability key belongs to the active taxonomy; complete distributions are not a requirement.
- blind-hunter: false — the migration helper test covers category, initial category, and probabilities, while browser checks confirm the restored UI path remains operational.
- edge-case-hunter: false — probability maps with valid active keys are structurally valid even when Coffee has no legacy score.
- verification-gap: patch — added direct comparison-request taxonomy coverage.
- verification-gap: low rejected — cloud legacy restoration uses the tested deterministic helper before cache hydration; the existing browser flow verifies no browser errors and a protected sample.
- verification-gap: low rejected — local-server startup migration has no behavior beyond the tested helper before `hydrate` spreads cached values.

## Design Notes

`restaurants` is the successor for legacy `dining` records because the old category cannot reliably be split after the fact without new inference. Coffee becomes available for all future classifications and evidence-backed decisions.

## Verification

**Commands:**
- `npm test` -- expected: parser, taxonomy, Worker, and persistence regression tests pass.
- `npm run build` -- expected: the production bundle builds successfully.
- `node browser-check.mjs` -- expected: the built-in sample and category UI render with active category IDs.
