# Deployment Guide

RIBBAI OPS is designed for deployment on Vercel with PostgreSQL and Supabase Storage.

## Required Checks

Run these commands before deployment:

```bash
npm run db:generate
npm run lint
npm run typecheck
npm run build
```

## Environment Variables

Configure all production values listed in `.env.example` in the Vercel project settings.

Production deployments must use:

- A production PostgreSQL `DATABASE_URL`
- A strong `AUTH_SECRET`
- Correct `APP_URL`, `AUTH_URL`, and `NEXTAUTH_URL`
- Supabase project URL, anon key, service role key, and storage bucket
- Production-appropriate logging and audit settings

## Database Migrations

Deploy migrations with:

```bash
npm run db:migrate:deploy
```

Do not run destructive migration reset commands against staging or production databases.

## Rollback

Use Vercel deployment rollback for application changes. Database rollback must be planned through explicit corrective migrations.
