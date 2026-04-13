# Decision Log

This file records every non-obvious architectural decision,
why it was made, and what alternatives were considered.
New decisions get added here as they are made.

---

## 001 — User and Person as separate tables
Date: [2026-03-13]
Decision: Store authentication (User) and real-world humans (Person) separately
Reason: Not every person in the system has an app account.
        Family members, domestic workers, elderly residents
        all need to be recorded without having logins.
Alternatives considered: Single users table with nullable fields
Why rejected: Leads to nullable column sprawl and unclear data model

---

## 002 — Self-referential property_nodes
Date: [2026-03-13]
Decision: One table for all property hierarchy levels
Reason: Different societies have different layouts.
        Fixed tables (towers/floors/units) break with every new layout.
        Self-referential tree handles any depth, any structure.
Alternatives considered: Separate towers, floors, units tables
Why rejected: Schema changes needed for every new building layout

---

## 003 — Time-ranged ownership and occupancy
Date: [2026-03-13]
Decision: Store ownership/occupancy as date-ranged records, not current state
Reason: History is required for legal disputes, audits, maintenance records.
        Overwriting current state destroys this history permanently.
Alternatives considered: current_owner_id column on units table
Why rejected: No historical data, can't answer past-state queries

---

## 004 — Permissions as database rows
Date: [2026-03-13]
Decision: Store permissions as strings in DB, roles as permission bundles
Reason: Custom roles per society are inevitable.
        Hardcoded role checks become unmaintainable after 5+ roles.
Alternatives considered: if/else role checks in code
Why rejected: Every new role requires code deployment, risk of missed checks

---

## 005 — Prisma 5 over Prisma 7
Date: [2026-03-13]
Decision: Use Prisma 5.22 not latest Prisma 7
Reason: Prisma 7 changed config approach, broke standard patterns,
        has less community support and fewer solved problems online.
Alternatives considered: Prisma 7, raw SQL, Drizzle ORM
Why rejected: Prisma 7 too new, raw SQL too verbose for this team size,
              Drizzle less mature ecosystem

---

## 006 — JsonB for PropertyNode metadata
Date: [2026-03-13]
Decision: Use @db.JsonB instead of plain Json for metadata column
Reason: JsonB in PostgreSQL is binary-stored, indexed, and faster to query.
        Enables future GIN indexes for metadata attribute queries.
Alternatives considered: Plain Json, separate columns per attribute
Why rejected: Plain Json slower for queries, separate columns inflexible

---

## 007 — AuditLog table added at foundation
Date: [2026-03-13]
Decision: Add audit_logs table during initial schema setup
Reason: Societies require accountability records for disputes.
        Retrofitting audit logging after features are built is painful.
        Table costs nothing to have, implementation added per feature.
Alternatives considered: Add later, use PostgreSQL triggers
Why rejected: Later addition requires touching all existing features,
              triggers harder to maintain than app-level logging

## 008 — Co-resident role added at foundation
Date: 2026-03-13
Decision: Add Co-resident system role and co_resident.invite permission
          to core seed data before feature development begins
Reason: Owner and tenant delegation of flat-scoped access is a
        guaranteed future requirement. Adding the role and permission
        to the foundation costs nothing and avoids a painful retrofit
        later. The route and UI are not built yet — just the data model
        is ready.
Alternatives considered: Add later when feature is built
Why rejected: Schema is already open for it. Seed change is trivial.
              Doing it now means the permission exists in all future
              test data automatically.
The rule: You can only assign a role with permissions equal to
          or less than your own. Co-resident cannot invite further.

## 009 — Permission strings renamed for clarity
Date: 2026-03-24
Decision: Renamed permission strings from technical names
          to descriptive domain names before first feature build
          org.create → society.create
          unit.create/update/view → node.create/update/view
          member.invite → invitation.create
          Added new permissions: society.update, node.delete,
          invitation.cancel, invitation.view,
          ownership.remove, ownership.view,
          occupancy.view, role.view
Reason: Pre-production is the only safe time to rename.
        After launch, changing permission strings in production
        requires data migrations on live user data.
        Clean naming now prevents confusion forever.
        node.* is more accurate than unit.* because
        the system handles towers, wings, floors, not just units.
Alternatives considered: Keep old names, add new ones alongside
Why rejected: Two sets of permission strings for same concepts
              creates confusion for every future developer.

## 010 — OrgType enum added to Organization
Date: 2026-03-24
Decision: Added type field to Organization model
          Values: APARTMENT, VILLA, MIXED, PLOTTED
Reason: Different society types affect UI and future features.
        A plotted development has no towers.
        A villa community has no floors.
        Knowing the type lets the app show relevant options.

## 011 — NodeType enum extended
Date: 2026-03-24
Decision: Added PHASE, BUILDING, VILLA, PLOT, BASEMENT
          to NodeType enum
Reason: Indian society layouts vary significantly.
        Township projects have phases.
        Plotted developments have plots not units.
        Adding now costs one migration line.
        Adding after launch costs a production migration.

## 012 — Member visibility restricted to admin only
Date: 2026-04-03
Decision: Residents cannot see other members details.
          Only Admin and Builder can view full member list.
Reason: DPDP Act 2023 compliance. Phone numbers and
        personal details cannot be shared without consent.
        Opt-in community directory planned for V2.
Alternatives considered: Show limited directory to residents
Why rejected: Even name + flat number without consent
              is a grey area legally. V1 stays conservative.

## 013 — Member removal is always soft
Date: 2026-04-03
Decision: Removing a member deactivates membership,
          never deletes it. Occupancy end dated separately.
          Two removal types in V1:
            1. Deactivate only (membership.isActive = false)
            2. Mark moved out (+ occupiedUntil = today)
Reason: Historical records needed for disputes, insurance,
        legal cases. Reactivation possible if mistake made.
Alternatives considered: Hard delete
Why rejected: Destroys history permanently.
              Cannot answer "who lived here in Jan 2023?"

## 014 — Only Builder can reactivate members
Date: 2026-04-03
Decision: Admin can deactivate but not reactivate.
          Only Builder can reactivate any member.
Reason: Prevents rogue admin locking out legitimate
        members permanently. Builder always has
        override capability.
Note: When RWA takes over from builder, RWA President
      role gets this capability via permission assignment.
      Zero code change needed.

## 015 — Test environment bypasses rate limiting
Date: 2026-04-06
Decision: OTP and API rate limiters are bypassed
          in NODE_ENV=test environment
Reason: Rate limiting is infrastructure not business logic.
        Tests must not be blocked by request counts.
        Standard practice across all professional test suites.

## 016 — Automated test suite added
Date: 2026-04-06
Decision: Jest + Supertest for integration tests.
          Tests run sequentially (runInBand).
          Single DB reset via globalSetup before all suites.
          Separate test DB: society_platform_test
Reason: Manual testing doesn't scale beyond 3 developers.
        Automated tests catch regressions in seconds.
        Required for CI/CD pipeline.

## 017 — SMS sending bypassed in test environment  
Date: 2026-04-06
Decision: sendOtp returns success without sending
          in development and test environments
Reason: Tests must not depend on external services.
        Real SMS would cost money and be unreliable in CI.

## 018 — Notification foundation built before feature work
Date: 2026-04-09
Decision: Push notification infrastructure built as a
standalone sprint before complaint management.
Reason: Gate entry notifications are core product value.
Retrofitting into already-built features costs 3-4x more.
Build pipe once, plug in per feature.

## 019 — Public complaints anonymous to other residents
Date: 2026-04-09
Decision: Public complaints show title, category, status
to all residents but hide complainant identity.
Admin always sees full details.
Reason: Transparency about society issues builds trust.
Exposing who complained about whom creates conflict.
Anonymous public complaints give information without
enabling targeted harassment.

## 020 — No reopen — new complaint instead
Date: 2026-04-09
Decision: Resolved complaints cannot be reopened.
Resident raises new complaint if issue persists.
Reason: Clean history. Each complaint is a discrete event.
No complex state management needed.

## 021 — Images on creation only
Date: 2026-04-09
Decision: Images attached only when raising complaint.
Cannot add after submission.
Reason: Evidence should be captured at time of complaint.
Post-submission images create ambiguity about timing.
Simplifies backend and mobile logic significantly.

## 022 — Cloudinary for image storage
Date: 2026-04-09
Decision: Cloudinary free tier for complaint images.
Reason: 25GB free storage sufficient for V1.
Simple SDK. Mobile upload directly to Cloudinary.
URLs stored in DB — no binary data in PostgreSQL.

## 023 — Push notifications not testable in Expo Go
Date: 2026-04-10
Decision: Skip push notification testing in Expo Go.
Use __DEV__ guard to prevent errors in development.
Notifications work correctly in production builds.
Reason: Expo SDK 53 removed push notification support
from Expo Go. Development build required for full testing.
Will test when EAS build is set up.

## 024 — ownedUntil added now for V2 readiness
**Date:** 2026-04-13
**Decision:** Add ownedUntil to unit_ownerships now even though
ownership transfer UI is V2.
**Reason:** Adding field later requires migration. Adding now
costs nothing. Enables full ownership history from day one.

## 025 — Ownership and occupancy are separate records
**Date:** 2026-04-13
**Decision:** Owner and occupant tracked independently.
One person can own a flat but not live there.
**Reason:** Reflects real Indian society reality — builder-owned
rentals, tenant arrangements, and investment properties are common.

## 026 — Deactivate does not end occupancy
**Date:** 2026-04-13
**Decision:** Deactivating a member removes app access only.
Occupancy record untouched. Only explicit moveout ends occupancy.
**Reason:** Deactivation is an app concern. Physical occupancy
is a real world fact. These are independent concepts.

## 027 — Multiple owners and occupants per flat
**Date:** 2026-04-13
**Decision:** No hard limit on ownership or occupancy records
per flat. One marked isPrimary for display purposes.
**Reason:** Joint ownership and family arrangements are standard
in Indian residential societies.

## 028 — Builder treated as any other owner
**Date:** 2026-04-13
**Decision:** Builder ownership recorded same as any member.
No special UI treatment for builder-owned flats.
**Reason:** Keeps architecture consistent. Admin can see all
flats regardless of who owns them.

## 029 — My Home shows primary flat on dashboard
**Date:** 2026-04-13
**Decision:** Dashboard shows primary flat details only.
Full My Home screen shows all linked flats.
**Reason:** Dashboard must stay clean. Members with multiple
flats get full detail in My Home screen.