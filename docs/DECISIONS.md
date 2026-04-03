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