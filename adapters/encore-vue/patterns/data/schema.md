# Pattern: validation schema

Shared, typed validation schemas live in `packages/shared` so the backend and the
frontend validate against the same definition. Use zod.

## Conventions

- One schema module per entity at `packages/shared/src/schemas/{entity}.schema.ts`.
- Derive the TypeScript type from the schema with `z.infer`, so the type and the
  validator never drift.
- Enumerations use `z.enum([...])` with the same values as the data-model
  `enum_values` and the migration `CHECK` constraint.

## Example

`packages/shared/src/schemas/registration.schema.ts`:

```ts
import { z } from "zod";

export const registrationStatus = z.enum([
  "draft", "submitted", "confirmed", "waitlisted", "cancelled",
]);

export const createRegistrationSchema = z.object({
  eventId: z.string().uuid(),
});

export const registrationSchema = z.object({
  id: z.string().uuid(),
  eventId: z.string().uuid(),
  attendeeId: z.string().uuid(),
  status: registrationStatus,
  submittedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export type Registration = z.infer<typeof registrationSchema>;
export type CreateRegistration = z.infer<typeof createRegistrationSchema>;
```
