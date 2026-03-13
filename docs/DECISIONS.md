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