# Pattern: types

Each resource declares its request and response types as plain TypeScript
interfaces. Payloads are bare (the object is the body), with no wrapping
envelope. Where a shared zod schema exists in `packages/shared`, derive types
from it rather than redefining them.

## Conventions

- One `types.ts` per resource at `apps/api/{resource}/types.ts`.
- Request types name only the fields the operation accepts; response types name
  only the fields it returns.
- Reuse the shared entity type for full-record responses.

## Example

`apps/api/registration/types.ts`:

```ts
import type { Registration } from "@app/shared/schemas/registration.schema";

export type { Registration };

export interface CreateRegistrationRequest {
  eventId: string;
}

export interface RegistrationDecisionRequest {
  id: string;
  decision: "confirmed" | "waitlisted";
}
```
