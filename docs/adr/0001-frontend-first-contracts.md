# ADR-0001: Frontend-first with frozen contracts

- **Status:** Accepted
- **Date:** 2026-08-18

## Context

The validated shareholder demo is a single client component (`app/page.tsx`) with in-memory data. The production system (spec §22) needs a secure backend + database. We must avoid building UI against throwaway shapes.

## Decision

Build the frontend first, but **freeze the frontend↔backend contracts before UI work**: entity types (§4 of `docs/architecture.md`), the `GarageRepository` seam (§5), the 10-state job machine (§3), and the RBAC action map (§2). The UI depends only on the contracts; the demo-backed implementation ships first, the Drizzle/Postgres implementation later with zero UI changes.

## Consequences

- The demo remains runnable throughout (shareholder presentations + seed source).
- Backend design is constrained to the contracts — no schema-first drift.
- Contract changes require a deliberate review (they affect both sides).