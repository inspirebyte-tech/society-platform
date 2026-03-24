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

<<<<<<< HEAD
Without global `turbo`, use your package manager:

```sh
cd my-turborepo
npx turbo dev
yarn exec turbo dev
pnpm exec turbo dev
```

You can develop a specific package by using a [filter](https://turborepo.dev/docs/crafting-your-repository/running-tasks#using-filters):

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed:

```sh
turbo dev --filter=web
```

Without global `turbo`:

```sh
npx turbo dev --filter=web
yarn exec turbo dev --filter=web
pnpm exec turbo dev --filter=web
```

### Remote Caching

> [!TIP]
> Vercel Remote Cache is free for all plans. Get started today at [vercel.com](https://vercel.com/signup?utm_source=remote-cache-sdk&utm_campaign=free_remote_cache).

Turborepo can use a technique known as [Remote Caching](https://turborepo.dev/docs/core-concepts/remote-caching) to share cache artifacts across machines, enabling you to share build caches with your team and CI/CD pipelines.

By default, Turborepo will cache locally. To enable Remote Caching you will need an account with Vercel. If you don't have an account you can [create one](https://vercel.com/signup?utm_source=turborepo-examples), then enter the following commands:

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed (recommended):

```sh
cd my-turborepo
turbo login
```

Without global `turbo`, use your package manager:

```sh
cd my-turborepo
npx turbo login
yarn exec turbo login
pnpm exec turbo login
```

This will authenticate the Turborepo CLI with your [Vercel account](https://vercel.com/docs/concepts/personal-accounts/overview).

Next, you can link your Turborepo to your Remote Cache by running the following command from the root of your Turborepo:

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed:

```sh
turbo link
```

Without global `turbo`:

```sh
npx turbo link
yarn exec turbo link
pnpm exec turbo link
```

## Useful Links

Learn more about the power of Turborepo:

- [Tasks](https://turborepo.dev/docs/crafting-your-repository/running-tasks)
- [Caching](https://turborepo.dev/docs/crafting-your-repository/caching)
- [Remote Caching](https://turborepo.dev/docs/core-concepts/remote-caching)
- [Filtering](https://turborepo.dev/docs/crafting-your-repository/running-tasks#using-filters)
- [Configuration Options](https://turborepo.dev/docs/reference/configuration)
- [CLI Usage](https://turborepo.dev/docs/reference/command-line-reference)
test
=======
Built by Inspirebyte.
>>>>>>> 6fca88c951291e69a906dc243fdbccc437d387d0
