# RIBBAI OPS

Enterprise restaurant operations platform foundation for RIBBAI.

This repository is currently in **Phase 1: Foundation Validation**. It contains infrastructure, configuration, database schema, and architectural foundations only. Business modules such as inventory, shifts, attendance, reporting, and dashboards are intentionally not implemented yet.

## Architecture

The project follows a server-first Next.js App Router architecture with domain-oriented feature boundaries.

- `app/` contains routing, layouts, API routes, and framework boundaries.
- `components/` contains shared UI primitives and reusable presentation components.
- `features/` contains future domain modules.
- `server/` contains repository, service, action, and middleware patterns.
- `lib/` contains shared infrastructure such as environment validation, database access, auth, logging, storage, errors, and audit utilities.
- `prisma/` contains the PostgreSQL schema and future migrations/seeds.
- `tests/` contains unit, integration, and E2E test suites.
- `docs/` contains architecture, planning, and status documentation.

See `docs/architecture/ARCHITECTURE.md` for the full architecture overview.

## Tech Stack

- Next.js 15 App Router
- React 19
- TypeScript
- TailwindCSS
- Prisma and PostgreSQL
- Auth.js
- Supabase Storage
- Puppeteer
- Recharts
- Vitest
- Playwright
- ESLint and Prettier

## Installation

```bash
npm install
```

## Environment Setup

Copy `.env.example` to `.env.local` and replace placeholder values with real local or deployed credentials.

Required environment groups:

- Application identity and URL
- PostgreSQL connection strings
- Auth.js secret and URL
- Supabase URL, anon key, service role key, and storage bucket
- Logging and audit flags
- Playwright base URL

## Development

```bash
npm run dev
```

## Validation Commands

```bash
npm run db:generate
npm run lint
npm run typecheck
npm run build
npm test
```

## Database

The Prisma schema is located at `prisma/schema.prisma`.

Generate the Prisma client:

```bash
npm run db:generate
```

Create development migrations after configuring a real local database:

```bash
npm run db:migrate
```

## Deployment

The intended deployment target is Vercel with PostgreSQL and Supabase Storage configured through environment variables. Production deployments must provide real values for all variables documented in `.env.example`.

## Contribution Guidelines

- Keep infrastructure changes separate from business module implementation.
- Run lint, type-check, tests, and build before opening a PR.
- Preserve strict TypeScript compatibility.
- Add tests for new infrastructure behavior.
- Update documentation when architecture or setup changes.
