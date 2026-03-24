# Architecture

## What We Are Building

A multi-tenant SaaS platform for residential society management.
Builder-first. Clean. No ads. No data selling.
Core features done exceptionally well rather than 250 features done averagely.

**Our promise:** A society should be fully operational in under 30 minutes.

---

## Who We Are Building For

**Primary market:**
- Small to medium societies: 20 to 200 units
- Builders managing new projects
- Societies currently on WhatsApp groups and physical registers

**Our positioning:**
"The platform that starts with the builder and grows with the society."

---

## The Four Layers

Everything in this system is organized into four layers.
Each layer is independent. Each layer has one job.
Upper layers depend on lower layers.
Lower layers never depend on upper layers.
```
┌─────────────────────────────────────────────────────┐
│                  OPERATIONS LAYER                   │
│   Complaints, Visitors, Announcements, Polls,       │
│   Emergencies, Directory, Asset Booking             │
│   Features — can be added, changed, removed         │
├─────────────────────────────────────────────────────┤
│                   ACCESS LAYER                      │
│   Roles, Permissions, Memberships                   │
│   Who can do what, in which society                 │
├─────────────────────────────────────────────────────┤
│                  PROPERTY LAYER                     │
│   Organizations, Towers, Units                      │
│   Ownership, Occupancy                              │
│   Physical world represented in software            │
├─────────────────────────────────────────────────────┤
│                  IDENTITY LAYER                     │
│   Users, People                                     │
│   Who exists in the system                          │
└─────────────────────────────────────────────────────┘
```

The rule: you can change, add, or remove any feature in the
Operations layer without touching anything below it.

---

## Layer 1 — Identity

### Why User and Person are separate tables

Most systems have one table — users. Everyone has an account.
This breaks the moment you need to record someone without an app account.

Real scenario:
- Owner registers — has an account ✓
- Owner's elderly mother lives in the flat — no smartphone ✗
- Owner's domestic worker comes daily — no app needed ✗
- Owner's child lives there — no account ✗

All four are real people your system needs to know about.
Only one has an account.

If you collapse Person into User:
- You can't store people without accounts
- You start adding nullable columns everywhere
- The table becomes a mess within months

**Our solution:**
```
Person = this human exists in our system
User   = this human has a login
```

Every human is a Person.
Only those with logins are also Users.
A Person has an optional link to a User — nullable user_id.

---

## Layer 2 — Property

### Why one self-referential table instead of towers/floors/units

The naive approach: three tables — towers, floors, units.

This breaks with every new client layout:
- Client A: Society → Unit (no towers)
- Client B: Society → Tower → Unit
- Client C: Society → Tower → Floor → Unit
- Client D: Society → Building → Wing → Floor → Unit

Every new layout needs schema changes.

**Our solution: property_nodes — one table, any structure.**

Each row has a parent_id pointing to another row in the same table.
Any depth. Any layout. Zero schema changes for new structures.
```
id   parent   type      name
1    null     society   Green Valley
2    1        tower     Tower A
3    1        tower     Tower B
4    2        unit      Flat 101
5    2        unit      Flat 102
6    3        unit      Flat 101
```

A simple 20-flat building with no towers:
all 20 units have parent = society root node.
Same table. Same code. No towers needed.

---

### Why Ownership and Occupancy are time-ranged

Most systems store current state only:
```
units
  current_owner_id
  current_tenant_id
```

This breaks when someone asks:
- "Who owned Flat 4B in January 2023?" — for a legal dispute
- "Who was living there when the pipe burst?" — for insurance
- "How many times has this unit changed tenants?" — for records

You have no answer. You overwrote it.

**Our solution: every change is a new record, old records stay forever.**
```
unit_ownerships
  person_id
  owned_from     DATE
  owned_until    DATE    ← null means currently owns

unit_occupancies
  person_id
  occupied_from  DATE
  occupied_until DATE    ← null means currently lives there
  is_primary     BOOL    ← who gets visitor notifications
```

Current owner query:   WHERE owned_until IS NULL
Historical query:      WHERE owned_from <= date AND (owned_until IS NULL OR owned_until >= date)

Full history forever. No extra work.

---

## Layer 3 — Access Control

### Why permissions are database rows, not code

The wrong way:
```typescript
if (user.role === 'admin') {
  allow()
}
```

This breaks when you need custom roles.
Every new role means finding every role check in the codebase
and adding a new condition. Miss one — wrong people see wrong data.

**Our solution: permissions are rows, roles are bundles.**
```
permissions table    → every action in the system as a string
roles table          → named bundles of permissions
role_permissions     → which permissions each role has
memberships          → which role a user has in a society
```

Adding a new role = inserting database rows.
Zero code change. Zero deployment.

The permission check is ONE function:
```
Does this user's role in this org include this permission string?
Yes → proceed. No → 403.
```

Written once. Called everywhere. Never duplicated.

---

### Why Membership exists separately from User

Wrong way: role column on the users table.

This breaks when one person belongs to multiple societies:
- Ravi is Admin in Green Valley
- Ravi is Resident in Sunrise Towers
- Same person, two societies, two different roles

With role on users: impossible to represent.

**Our solution: Membership connects User + Org + Role.**
```
memberships
  user_id   → who
  org_id    → in which society
  role_id   → doing what
```

One row per society relationship.
Ravi has two membership rows. Different role in each.
Works for 1 society or 100 societies.

---

### The Three Things That Look The Same But Aren't
```
Ownership   = legal.   Who holds the property deed.
Occupancy   = physical. Who actually lives there.
Membership  = digital.  Who has app access.
```

These are always stored separately.
They can point to completely different people — and often do.

Real example:
```
Flat 4B:
  Owner     → Arjun Mehta      (lives in Hyderabad, owns the flat)
  Occupant  → Sharma family    (tenants, actually living there)
  Members   → Both Arjun and   (both have app access,
               Mrs. Sharma      different roles)
```

---

## Layer 4 — Operations

Every feature table follows the same pattern:
```
Every operations table has:
  org_id     → which society  (multi-tenancy enforcement)
  person_id  → who            (from identity layer)
  unit_id    → which flat     (from property layer, where relevant)
```

**Why org_id on every table:**

This is your multi-tenancy guarantee.
Green Valley and Sunrise Towers both use this platform.
A bug in your code should never show Green Valley's data
to a Sunrise Towers admin.

Every query is automatically scoped:
```sql
-- Never:
SELECT * FROM complaints WHERE id = '123'

-- Always:
SELECT * FROM complaints
WHERE id = '123' AND org_id = 'current_org_from_auth'
```

The middleware injects org_id from the auth token.
Cross-tenant data leak is structurally impossible.

---

## The Permission Check — How Every Request Works
```
Request arrives
      │
      ▼
Who is this? (from auth token → user_id)
      │
      ▼
Which society? (from token → org_id)
      │
      ▼
Load membership(user_id, org_id) → get role → get permissions
      │
      ▼
Does permissions include the required string?
      │
   YES → proceed     NO → 403
```

This is one function in src/middleware/permission.ts.
Every route uses it. You never write access logic twice.

---

## Default Roles
```
Builder     → creates societies, manages structure, assigns admins
Admin       → manages members, complaints, announcements, visitors
Resident    → raises complaints, approves visitors, views announcements
Gatekeeper  → logs visitors, handles gate entry flow
```

Roles are stored in the database.
Custom roles per society can be created by admins.
New role = new database rows. No code change.

---

## Multi-Tenancy

Every table that holds society data has org_id.
The auth middleware extracts org_id from the JWT token.
All queries are scoped to org_id automatically.

One person can belong to multiple societies.
Each society's data is completely isolated.
No society can ever see another society's data.

---

## Adding New Features

Every future feature follows this pattern:
```
1. New migration adding feature tables
   (always include org_id, person_id, unit_id where relevant)

2. New permission strings added to permissions table

3. New endpoints following existing route patterns

4. Frontend builds against the API contract
```

Nothing in the core layers changes.
Features are always additive.

---

## What This Architecture Handles Without Changes
```
Custom roles per society         → role table has org_id
Builder handover to RWA          → deactivate membership
Multiple owners per unit         → multiple ownership rows
Owner living elsewhere           → ownership ≠ occupancy
Tenant changes                   → time-ranged occupancy records
Person with no app account       → person without user
User in multiple societies       → multiple membership rows
Any physical building layout     → self-referential property_nodes
Future payments feature          → new tables, same anchors
Future analytics                 → read existing tables
```

## Database Performance

### Indexes
Core indexes are defined on high-traffic query patterns:
- PropertyNode: orgId + parentId (hierarchy traversals)
- Membership: userId + orgId (auth permission lookups)
- UnitOwnership: unitId + ownedUntil (current owner queries)
- UnitOccupancy: unitId + occupiedUntil (current occupant queries)

Additional indexes should be added based on actual query
patterns once the app is running. Use EXPLAIN ANALYZE
in PostgreSQL to identify slow queries.

### JsonB
PropertyNode.metadata uses JsonB (not Json) for efficient
querying of unit attributes like BHK type, square footage, etc.

### Audit Logs
An audit_logs table exists to track changes across the system.
Every significant mutation (role change, unit assignment,
member removal) should write an audit log entry.
Table is ready — population is implemented per feature.