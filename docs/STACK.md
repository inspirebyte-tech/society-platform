# Tech Stack

## Why This Stack

Chosen for:
- TypeScript everywhere (one language, full stack)
- Strong ecosystem and community
- Hiring availability in Indian market
- Monorepo keeps everything in one place

---

## Backend

**Runtime:** Node.js v20+
**Framework:** Express.js
**Language:** TypeScript
**ORM:** Prisma 5.22
**Database:** PostgreSQL

### Why Express over NestJS or Fastify
Express is minimal and explicit.
Junior developers can read and understand every line.
NestJS adds too much magic — decorators, modules, dependency injection.
That magic becomes a problem when the team is learning.
Fastify is fine but Express has more solved problems online.

### Why Prisma 5 over Prisma 7
Prisma 7 changed configuration patterns significantly.
Prisma 5 has more community support, more solved problems,
and works reliably with our monorepo setup.
We upgrade when Prisma 7 stabilises.

### Why PostgreSQL
Relational data with real foreign keys.
Our data is deeply relational — units, owners, occupants,
memberships, permissions — all connected.
PostgreSQL handles this correctly.
JSON support (JsonB) for flexible metadata fields.
Free, open source, runs everywhere.

---

## Monorepo

**Tool:** Turborepo
```
apps/
  api      → Express backend
  web      → React web app (admin dashboard)
  mobile   → React Native mobile app (residents, gatekeeper)

packages/
  shared   → types, constants shared across apps
  db       → Prisma client (future extraction)
  ui       → shared UI components (future)
```

### Why Monorepo
One repository, one pull request, one review for changes
that touch backend and frontend together.
Shared TypeScript types between API and frontend —
the same type definition, no duplication, no drift.

---

## Frontend (Web)

**Framework:** React
**Language:** TypeScript
**Styling:** TBD (Tailwind CSS preferred)
**State:** TBD (React Query preferred for server state)

Target users: Builder, Admin
Primary device: Desktop / laptop browser

---

## Mobile

**Framework:** React Native
**Language:** TypeScript

Target users: Resident, Gatekeeper
Primary device: Android (primary Indian market), iOS

---

## Auth

**Strategy:** Phone number + OTP (primary)
**Tokens:** JWT stored in secure storage
**Sessions:** Stateless — token carries userId and orgId

### Why Phone Not Email
Indian users are more reachable on phone.
Societies don't always have member emails.
OTP via SMS is familiar and trusted.

---

## Infrastructure (Current)
```
Database:    Local PostgreSQL (dev)
API server:  Local Node.js (dev)
Hosting:     TBD for production
```

Production infrastructure decisions deferred until
V1 feature complete. Will evaluate Railway, Render,
or AWS depending on cost and scale at that point.

---

## Dev Tools
```
Version control:    Git + GitHub
Project board:      GitHub Projects
Docs:               This /docs folder + Notion for briefs
API testing:        Thunder Client (VS Code extension)
DB management:      pgAdmin
Communication:      Discord
Wireframes:         Excalidraw
```

---

## What We Are Not Using And Why
```
GraphQL       → Overkill for this team size and feature set
MongoDB       → Our data is relational, document DB is wrong fit
Microservices → Premature. Monolith first, extract later if needed
Docker        → Added complexity during early development
Redis         → Not needed until caching becomes a real problem
```