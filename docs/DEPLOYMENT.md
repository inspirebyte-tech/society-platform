# Deployment Guide

## Infrastructure
- API: Render Web Service (free tier, Oregon)
- Database: Neon PostgreSQL (free tier, Singapore)
- Mobile: Expo EAS builds

## Why Render + Neon
- Render: simple GitHub integration, free tier for pilot
- Neon: PostgreSQL with no expiry on free tier
- Both can be migrated to AWS later without code changes
- Migration path: pg_dump → pg_restore, update DATABASE_URL only

## Environment Variables (Render)
DATABASE_URL         → Neon pooler URL
JWT_SECRET           → JWT signing secret
JWT_REFRESH_SECRET   → JWT refresh signing secret
CLOUDINARY_CLOUD_NAME → Cloudinary cloud name
CLOUDINARY_API_KEY   → Cloudinary API key
CLOUDINARY_API_SECRET → Cloudinary API secret
MSG91_AUTH_KEY       → MSG91 authentication key
MSG91_SENDER_ID      → VAASTIO
MSG91_TEMPLATE_ID    → MSG91 OTP template ID
NODE_ENV             → production

## Build Configuration
Build command: npm install && npx prisma generate && npm run build
Start command: npm start
Root directory: apps/api
Node version: 24.x

## TypeScript Build Notes
Uses tsconfig.build.json (not tsconfig.json) for production builds.
Relaxed type checking flags needed due to Express v5 + @types/express v5
type system quirks. Runtime behaviour is identical to development.
Tests use ts-jest with separate configuration and are unaffected.

Known technical debt:
- (req as any).ip in auth.ts — loses type safety on one field
- AuthRequest explicitly re-declares params/body/query/headers
  as workaround for Express v5 interface extension issues

## Running Migrations on Production
Use Neon direct URL (not pooler) for migrations:
  DATABASE_URL=<direct_url> npx prisma migrate deploy

Never run prisma migrate dev on production.
Use prisma migrate deploy only.

## Seeding Production
DATABASE_URL=<direct_url> npx prisma db seed
Only run once on initial setup.
Test users (Builder, Resident, Gatekeeper, Co-resident)
are created — remove before real pilot.

## Future Migration to AWS
1. Create RDS PostgreSQL instance
2. pg_dump from Neon → pg_restore to RDS
3. Update DATABASE_URL in Render (or ECS) env vars
4. Zero code changes required

## Rollback
Render keeps previous deploys.
Click "Rollback" in Render dashboard to revert instantly.
