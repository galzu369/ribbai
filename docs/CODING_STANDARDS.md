# Coding Standards

## Scope

These standards apply to infrastructure and future business modules in RIBBAI OPS.

## TypeScript

- Keep `strict` mode enabled.
- Prefer explicit domain types over loose records.
- Avoid `any`; use `unknown` and narrow intentionally.
- Keep environment access behind `lib/env`.

## React and Next.js

- Use Server Components by default.
- Use Client Components only for interactivity or browser APIs.
- Keep route files thin and delegate logic to services.
- Avoid business logic inside components.

## Server Layers

- Repositories own data access.
- Services own business orchestration.
- Server Actions or route handlers own transport concerns.
- Infrastructure utilities live under `lib`.

## Database

- Use Prisma for database access.
- Keep schema changes auditable through migrations.
- Prefer soft delete fields for operational records.
- Write audit logs for sensitive mutations.

## Testing

- Unit test infrastructure utilities and service behavior.
- Integration test repository and database interactions.
- E2E test critical user journeys after features exist.

## Code Review

- Confirm no business modules are introduced during foundation work.
- Confirm strict TypeScript, lint, test, and build commands pass.
- Confirm environment variables are documented.
- Confirm sensitive values are not committed.
