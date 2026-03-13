# Society Platform

Society management software built for Indian residential societies.
Builder-first. Operational in 30 minutes. No ads. No data selling.

---

## What It Does

- Builder sets up a society before handover to residents
- Admin manages members, complaints, announcements
- Residents raise complaints, approve visitors, book amenities
- Gatekeeper manages physical entry with real-time resident approval

---

## Who It's For

Small to medium societies: 20 to 200 units.
Builders managing new residential projects.
Societies currently running on WhatsApp groups and physical registers.

---

## Stack
```
Backend:   Node.js + Express + TypeScript + Prisma + PostgreSQL
Web:       React + TypeScript
Mobile:    React Native + TypeScript
Monorepo:  Turborepo
```

Full details in [docs/STACK.md](docs/STACK.md)

---

## Getting Started

See [docs/SETUP.md](docs/SETUP.md) for complete local setup instructions.

Quick version:
```bash
git clone https://github.com/inspirebyte-tech/society-platform.git
cd society-platform
npm install
cd apps/api
cp .env.example .env
# fill in .env values
npx prisma migrate reset
npx tsx src/index.ts
```

---

## Documentation
```
docs/ARCHITECTURE.md   → system design and why
docs/FEATURES.md       → what the app does per role
docs/PERMISSIONS.md    → every permission string and role bundle
docs/STACK.md          → tech choices and reasoning
docs/DECISIONS.md      → architectural decision log
docs/SETUP.md          → local development setup
```

---

## Branch Strategy
```
main        → stable, protected, PRs only
dev         → integration branch, all features merge here
feature/*   → individual feature work
fix/*       → bug fixes
```

Never push directly to main or dev.
Always create a branch, always open a PR.

---

## Project Status

Currently in active development.
V1 target: Core society management features.
See GitHub Projects board for current progress.

---

## Team

Built by Inspirebyte.