# ADR-0002: Single-garage product on a multi-tenant-ready schema

- **Status:** Accepted
- **Date:** 2026-08-18

## Context

The MVP must run one real garage successfully (spec §27) but the platform is multi-tenant (spec §15: "Garage A must never access Garage B data"). Retrofitting tenant scoping later is expensive.

## Decision

Ship the product as **single-garage**, but keep the **schema and plumbing tenant-aware from M1B**:

- `garages` table exists; every tenant table carries `garage_id` with composite primary keys `(garage_id, id)` and garage-scoped unique constraints.
- A request-scoped tenant context is resolved from the session and enforced via `requireTenant()` in the service layer; Postgres RLS as defense-in-depth.
- `garage_memberships` maps staff to a garage; `super_admin` operates in a non-tenant namespace.
- An isolation test is written in M1B (seed a throwaway "Garage B"; assert Garage A can never read/list/mutate its rows).

Deferred (feature release, no migration): garage registration/onboarding, tenant provisioning API, Super Admin console, per-garage branding, subscription/limits.

## Consequences

- Slightly more up-front design cost; multi-tenancy is a feature flip, not a rebuild.
- Every query is scoped from day one — no "skip `garage_id` because there's one garage" shortcuts.
- The frontend AppShell binds the repository to one garage today; multi-garage selection is a later UI feature.