# Pattern: seed and fixtures

Reference data (lookup rows the app depends on) is seeded deterministically.
Development fixtures (sample transactional rows) are generated for local work and
tests, never for production.

## Conventions

- Seeds are idempotent SQL at `apps/api/db/seeds/{name}.sql`, safe to re-run
  (`INSERT ... ON CONFLICT DO NOTHING`).
- Fixtures are produced by a factory module at
  `packages/shared/src/fixtures/index.ts`, keyed by entity and profile (for
  example a `draft` registration vs a `confirmed` one).
- Seed reference entities first, then entities that reference them.

## Example

`apps/api/db/seeds/event.sql`:

```sql
INSERT INTO event (id, slug, name, starts_at, ends_at, capacity, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'demo-conf', 'Demo Conference',
        now() + interval '30 days', now() + interval '31 days', 100, 'published')
ON CONFLICT (slug) DO NOTHING;
```

`packages/shared/src/fixtures/index.ts`:

```ts
import type { Registration } from "../schemas/registration.schema";

export function registrationFixture(p: Partial<Registration> = {}): Registration {
  return {
    id: crypto.randomUUID(),
    eventId: "00000000-0000-0000-0000-000000000001",
    attendeeId: crypto.randomUUID(),
    status: "draft",
    submittedAt: null,
    createdAt: new Date().toISOString(),
    ...p,
  };
}
```
