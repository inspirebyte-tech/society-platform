# Setup Guide

## Prerequisites
- Node.js v20+ (use nvm to manage versions)
- PostgreSQL (port 5433)
- Git

## First Time Setup

### 1. Clone the repo
git clone https://github.com/inspirebyte-tech/society-platform.git
cd society-platform

### 2. Install dependencies
npm install

### 3. Set up the API environment
cd apps/api
cp .env.example .env

Open .env and set:
DATABASE_URL="postgresql://postgres:YOURPASSWORD@localhost:5433/society_platform_dev"
JWT_SECRET="any-random-string-for-local-dev"

### 4. Create the database
psql -U postgres -p 5433 -c "CREATE DATABASE society_platform_dev;"

### 5. Run migrations and seed
npx prisma migrate reset

Type 'y' when prompted.
This creates all tables and seeds test data.

### 6. Start the API server
npx tsx src/index.ts

Server runs on http://localhost:3000

### 7. Verify it works
GET http://localhost:3000/api/health
Should return: { "status": "ok" }

GET http://localhost:3000/api/test-tokens
Should return 3 users with tokens.

## Test Users (created by seed)
  Builder:    +911111111111
  Resident:   +912222222222
  Gatekeeper: +913333333333

## Branch Strategy
  main          → stable, never push directly
  dev           → integration branch
  feature/*     → your work goes here

## Daily Flow
  git checkout dev
  git pull origin dev
  git checkout -b feature/your-task-name
  ... do your work ...
  git push origin feature/your-task-name
  open PR → target: dev

## Common Issues

### tsx not found
npm install -D tsx

### Prisma engine download fails
Add to .env:
PRISMA_ENGINES_MIRROR=https://registry.npmmirror.com/-/binary/prisma
Then retry.

### Port 5432 connection refused
Your PostgreSQL runs on 5433 not 5432.
Make sure DATABASE_URL uses port 5433.

### Unknown file extension .ts
Use tsx instead of ts-node:
npx tsx src/index.ts