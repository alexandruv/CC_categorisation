---
title: 'Categorise named coffee merchants'
type: 'feature'
ticket: ''
created: '2026-09-27'
status: 'built'
baseline_revision: 'c846bb248a1a19f95593cb79fa15935e829a7f3b'
route: 'oneshot'
route_source: 'auto'
review: 'quick'
review_source: 'auto'
lenses_ran: []
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Coffee merchants can still receive a model or bank-derived non-coffee category, including ŻYWIOLY despite its grocery bank label.

**Approach:** Apply a deterministic, case-insensitive merchant-name rule that makes transactions containing `coffee`, `cafe`, `cofeina`, `java coffee`, `kawiarnia`, `cafea`, or `zywioly` show as Coffee expenses.

</frozen-after-approval>

## Implementation Notes

This is a narrow deterministic override. The existing `reviewedDecision` result is applied after initial and bank-assisted classification by both the Worker and the local server, so it is the shared point to extend.

Added a shared, case-insensitive merchant-name matcher in `reviewed.mjs` and regression cases for every requested spelling in `categorizer.test.mjs`. The override is applied after initial and bank-assisted classifications, so a matching transaction displays as Coffee regardless of either result.

The review added the accented Polish spelling `ŻYWIOLY` alongside the bank-export spelling `ZYWIOLY`.

## Plan Change Log

## Review Triage Log

- patch — `reviewed.mjs` initially matched only ASCII `ZYWIOLY`; expanded the rule and regression test to cover `ŻYWIOLY` too.

## Verification

**Commands:**
- `npm test` -- expected: existing parser, categorisation, Worker, and persistence tests pass, including the listed merchant-name variants.
