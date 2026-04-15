# Feature Brief: Unit Assignment

## Status
Planned

## Priority
High — completes the core resident experience.
Without this every member shows "Pending Setup"
and no resident is linked to a flat.
This is the missing link between society structure
and member management.

---

## Overview

Two distinct concepts managed together:

**Ownership** — who owns the flat legally.
  Arjun owns Flat 4B.
  Recorded permanently. Changes only on sale.

**Occupancy** — who is currently living in the flat.
  Arjun lives in Flat 4B (owner-resident).
  OR Priya lives there as tenant.
  Changes when people move in or move out.

Both can have multiple people simultaneously.
Both are tracked with full history.

---

## Who Uses It

Builder — assign ownership and occupancy.
          View all flats, ownership, occupancy.
          Track vacant flats.

Admin — same as Builder for day-to-day operations.
        RWA secretary typically handles this.

Resident — view their own flat(s).
           See co-owners and co-occupants.
           Cannot assign anything.

Co-resident — same view as Resident (own flat only).

Gatekeeper — no access.

---

## Real World Scenarios

### Scenario 1 — Builder hands over flat to owner
Builder creates society, sets up Tower A → Flat 4B.
Builder invites Arjun as Resident.
Arjun accepts → becomes member.
Admin links Arjun to Flat 4B:
Ownership: PRIMARY_OWNER
Occupancy: OWNER_RESIDENT, isPrimary
Arjun now shows: Flat 4B · Owner · Resident
Moves from Pending Setup → Active.

### Scenario 2 — Builder rents flat directly
Builder keeps Flat 5C and rents to Priya.
Builder invites Priya as Resident.
Admin links:
Ownership: Builder → Flat 5C, PRIMARY_OWNER
Occupancy: Priya → Flat 5C, TENANT, isPrimary
Builder owns it. Priya lives in it.
Both records coexist on same flat.

### Scenario 3 — Joint ownership
Arjun and Meera jointly own Flat 4B.
Admin links:
Arjun → Flat 4B, PRIMARY_OWNER
Meera → Flat 4B, CO_OWNER
Both show as owners of same flat.

### Scenario 4 — Owner + family living together
Arjun owns and lives in Flat 4B.
His wife Meera (Co-resident) also lives there.
Admin links:
Arjun → Flat 4B, OWNER_RESIDENT, isPrimary
Meera → Flat 4B, FAMILY, isPrimary=false
Both linked to same flat.

### Scenario 5 — Tenant in owner's flat
Arjun owns Flat 4B but doesn't live there.
He rents it to Priya.
Admin links:
Ownership: Arjun → Flat 4B, PRIMARY_OWNER
Occupancy: Priya → Flat 5B, TENANT, isPrimary
Arjun is owner. Priya is occupant. Different people.

### Scenario 6 — Same person owns multiple flats
Arjun owns Flat 4B and Flat 5C as investments.
Two ownership records — both pointing to Arjun.
My Home screen shows both flats.
Dashboard shows primary flat.

### Scenario 7 — Member moves out
Priya moves out of Flat 4B.
Admin marks Priya as moved out (already built).
Her occupancy record: occupiedUntil = today.
Flat 4B becomes vacant.
Vacant flat appears in inventory view.

### Scenario 8 — Ownership ends (V2 UI, field exists now)
Arjun sells Flat 4B to new person.
Admin ends Arjun's ownership: ownedUntil = today.
New owner invited and linked.
Full history preserved.

---

## What It Does NOT Do

- No ownership transfer UI (V2 — field exists in schema now)
- No non-app owner records (V1 — all via memberships)
- No bulk assignment (V2)
- No ownership documents or legal records
- No maintenance charge calculation
- No payment tracking

---

## Occupancy Types — Final
OWNER_RESIDENT  → owns the flat, lives there
TENANT          → renting, living there
FAMILY          → family member of owner/tenant
CARETAKER       → domestic staff living on premises

## Ownership Types — Final
PRIMARY_OWNER   → main legal owner of flat
CO_OWNER        → joint owner (equal rights)

---

## Status Rules
Member status (in member list):
Active:
Has active membership (isActive = true)
AND has at least one active occupancy
→ Shows flat name and occupancy type
Pending Setup:
Has active membership
BUT no active occupancy assigned yet
→ Shows "No unit assigned"
Inactive:
isActive = false
→ Does not appear in active list

---

## Vacant Flat Definition
A flat (property node of type UNIT) is vacant when:
No active occupancy exists for it
(no unit_occupancy row where orgId matches
AND nodeId matches
AND occupiedUntil IS NULL)
Vacant flats visible to: Admin, Builder only.

---

## My Home Screen — Resident View
Triggered from Dashboard:
"My Home" action → only if resident
has at least one active occupancy
Screen shows:
Primary flat details:
Name (e.g. Flat 4B)
Tower/Wing path (e.g. Tower A → Wing 1)
BHK, Floor, Area (from node metadata)
Occupancy type (Owner-Resident / Tenant / Family)
Co-owners of this flat:
List of all owners (from unit_ownerships)
Their name, ownership type
Co-occupants of this flat:
List of all current occupants
Their name, occupancy type
Excluding self
Occupancy history:
All past occupancies for this flat
Name, type, from date, until date
If member has multiple flats:
Dashboard shows primary flat
My Home screen shows all flats with tab/list

---

## Database Changes

### Update unit_ownerships table

Add ownedUntil field (industry-grade — enables history):

```sql
ALTER TABLE unit_ownerships
ADD COLUMN owned_until TIMESTAMP;
```

No other changes needed to ownership table.

### New enum values in schema

```prisma
enum OwnershipType {
  PRIMARY_OWNER
  CO_OWNER
}

enum OccupancyType {
  OWNER_RESIDENT
  TENANT
  FAMILY
  CARETAKER
}
```

### Indexes needed
unit_ownerships:
(orgId, nodeId) → fetch owners of a flat
(orgId, userId) → fetch flats owned by a person
(orgId, nodeId, ownedUntil) → active owners only
unit_occupancies:
(orgId, nodeId) → fetch occupants of a flat
(orgId, userId) → fetch flats occupied by a person
(orgId, nodeId, occupiedUntil) → active occupants only
(orgId, occupiedUntil) → all vacant flat detection

---

## Permissions Needed
New permissions:
unit.assign        → assign ownership or occupancy
unit.view_all      → view all flats and assignments
unit.view_own      → view own flat details only
Role bundles:
Builder → unit.assign, unit.view_all
Admin   → unit.assign, unit.view_all
Resident → unit.view_own
Co-resident → unit.view_own
Gatekeeper → none

---

## API Endpoints

### POST /societies/:id/units/:nodeId/ownership
Assign ownership of a flat to a member.

**Auth:** Required
**Permission:** unit.assign

**Request:**
```json
{
  "userId": "uuid",
  "ownershipType": "PRIMARY_OWNER",
  "isPrimary": true
}
```

**Response 201:**
```json
{
  "data": {
    "id": "uuid",
    "flatName": "Flat 4B",
    "member": {
      "name": "Arjun Mehta",
      "phone": "+919222222222"
    },
    "ownershipType": "PRIMARY_OWNER",
    "isPrimary": true,
    "ownedFrom": "datetime"
  }
}
```

**Errors:**
400 missing_field         → userId or ownershipType missing
400 invalid_ownership_type → not PRIMARY_OWNER or CO_OWNER
400 not_a_unit            → nodeId is not a UNIT type node
400 already_has_primary   → flat already has primary owner
and isPrimary: true sent again
404 node_not_found        → flat doesn't exist in this society
404 member_not_found      → userId not a member of this society
403 insufficient_permissions

---

### DELETE /societies/:id/units/:nodeId/ownership/:ownershipId
End ownership (mark ownedUntil = today).

**Auth:** Required
**Permission:** unit.assign

**Response 200:**
```json
{
  "data": {
    "message": "ownership_ended",
    "ownedUntil": "datetime"
  }
}
```

**Errors:**
404 ownership_not_found → ownership record not found
400 already_ended       → ownership already ended

---

### POST /societies/:id/units/:nodeId/occupancy
Assign occupancy of a flat to a member.

**Auth:** Required
**Permission:** unit.assign

**Request:**
```json
{
  "userId": "uuid",
  "occupancyType": "OWNER_RESIDENT",
  "isPrimary": true
}
```

**Response 201:**
```json
{
  "data": {
    "id": "uuid",
    "flatName": "Flat 4B",
    "member": {
      "name": "Arjun Mehta",
      "phone": "+919222222222"
    },
    "occupancyType": "OWNER_RESIDENT",
    "isPrimary": true,
    "occupiedFrom": "datetime"
  }
}
```

**Errors:**
400 missing_field          → userId or occupancyType missing
400 invalid_occupancy_type → not a valid occupancy type
400 not_a_unit             → nodeId is not UNIT type
400 already_has_primary    → flat already has primary occupant
and isPrimary: true sent again
400 already_occupying      → member already has active occupancy
in this flat
404 node_not_found
404 member_not_found
403 insufficient_permissions

---

### DELETE /societies/:id/units/:nodeId/occupancy/:occupancyId
End occupancy (mark occupiedUntil = today).

**Auth:** Required
**Permission:** unit.assign

**Response 200:**
```json
{
  "data": {
    "message": "occupancy_ended",
    "occupiedUntil": "datetime"
  }
}
```

---

### GET /societies/:id/units/:nodeId
Get full details of a flat — owners, occupants, history.

**Auth:** Required
**Permission:** unit.view_all (admin/builder) OR unit.view_own (if own flat)

**Response 200:**
```json
{
  "data": {
    "id": "uuid",
    "name": "Flat 4B",
    "code": "4B",
    "floor": 4,
    "bhk": "2BHK",
    "area": 950,
    "path": "Tower A → Wing 1",
    "isVacant": false,
    "owners": [
      {
        "id": "uuid",
        "name": "Arjun Mehta",
        "phone": "+919222222222",
        "ownershipType": "PRIMARY_OWNER",
        "isPrimary": true,
        "ownedFrom": "datetime",
        "ownedUntil": null
      }
    ],
    "currentOccupants": [
      {
        "id": "uuid",
        "name": "Arjun Mehta",
        "phone": "+919222222222",
        "occupancyType": "OWNER_RESIDENT",
        "isPrimary": true,
        "occupiedFrom": "datetime"
      }
    ],
    "occupancyHistory": [
      {
        "name": "Priya Shah",
        "occupancyType": "TENANT",
        "occupiedFrom": "datetime",
        "occupiedUntil": "datetime"
      }
    ]
  }
}
```

---

### GET /societies/:id/units
List all units with occupancy status.

**Auth:** Required
**Permission:** unit.view_all

**Query params:**
status → vacant, occupied, all (default: all)
tower  → filter by tower nodeId

**Response 200:**
```json
{
  "data": {
    "units": [
      {
        "id": "uuid",
        "name": "Flat 4B",
        "path": "Tower A → Wing 1",
        "isVacant": false,
        "primaryOwner": "Arjun Mehta",
        "primaryOccupant": "Arjun Mehta",
        "occupancyType": "OWNER_RESIDENT"
      },
      {
        "id": "uuid",
        "name": "Flat 5C",
        "path": "Tower A → Wing 2",
        "isVacant": true,
        "primaryOwner": "Vikram Builder",
        "primaryOccupant": null,
        "occupancyType": null
      }
    ],
    "total": 48,
    "occupied": 36,
    "vacant": 12
  }
}
```

---

### GET /societies/:id/members/:memberId/units
Get all flats linked to a specific member.
Used for My Home screen.

**Auth:** Required
**Permission:** unit.view_all OR unit.view_own (own member only)

**Response 200:**
```json
{
  "data": {
    "ownerships": [
      {
        "flatId": "uuid",
        "flatName": "Flat 4B",
        "path": "Tower A → Wing 1",
        "ownershipType": "PRIMARY_OWNER",
        "isPrimary": true,
        "ownedFrom": "datetime",
        "coOwners": [
          {
            "name": "Meera Mehta",
            "ownershipType": "CO_OWNER"
          }
        ]
      }
    ],
    "occupancies": [
      {
        "flatId": "uuid",
        "flatName": "Flat 4B",
        "path": "Tower A → Wing 1",
        "occupancyType": "OWNER_RESIDENT",
        "isPrimary": true,
        "occupiedFrom": "datetime",
        "coOccupants": [
          {
            "name": "Meera Mehta",
            "occupancyType": "FAMILY"
          }
        ]
      }
    ]
  }
}
```

---

## Mobile Screens Needed
Admin side:
AssignUnitScreen
→ Triggered from MemberDetailScreen
→ Pick flat from structure tree
→ Choose ownership type
→ Choose occupancy type
→ Confirm
UnitDetailScreen
→ Shows owners, occupants, history
→ Add/remove owner button
→ Add/remove occupant button
→ Access from StructureScreen (tap a unit)
UnitInventoryScreen
→ List of all units
→ Filter: All / Occupied / Vacant
→ Each row: flat name, status, who lives there
Resident side:
MyHomeScreen
→ Flat name, path, details
→ Co-owners
→ Co-occupants
→ Occupancy history
→ Access from Dashboard

---

## User Flows

### Flow 1 — Admin assigns flat to resident
Admin opens Members → finds Arjun (Pending Setup)
Taps Arjun → Member Detail screen
Taps "Assign Unit" button
Structure picker opens → shows all UNIT nodes
Admin picks Flat 4B
Chooses ownership type: PRIMARY_OWNER
Chooses occupancy type: OWNER_RESIDENT
Confirms
→ POST /ownership + POST /occupancy
→ Arjun moves from Pending Setup to Active
→ Shows Flat 4B · Owner · Resident

### Flow 2 — Admin views vacant flats
Admin opens Unit Inventory
Filters by: Vacant
Sees: Flat 5C, Flat 7B, Flat 9A
Taps Flat 5C → Unit Detail
Sees: Owner is Vikram Builder, no occupant
Taps "Add Occupant" → member picker
Selects a member → occupancy created

### Flow 3 — Resident views My Home
Resident opens Dashboard
Sees "My Home" action
Taps → My Home screen
Sees: Flat 4B · Tower A · Wing 1
2BHK · Floor 4 · 950 sq.ft
Owner-Resident
Co-owners: Meera Mehta (Co-owner)
Co-occupants: Meera Mehta (Family)

### Flow 4 — Admin removes occupant
Admin opens Unit Detail for Flat 4B
Sees Priya as current occupant (Tenant)
Taps end occupancy for Priya
Confirms
→ DELETE /occupancy/:id
→ occupiedUntil = today
→ Flat 4B becomes vacant

---

## Edge Cases
Assigning non-UNIT node:
POST /ownership or /occupancy with a Tower node
→ 400 not_a_unit
Assigning member not in society:
→ 404 member_not_found
Two PRIMARY_OWNERs on same flat:
Second assignment with isPrimary: true
→ 400 already_has_primary
Admin must end first or use CO_OWNER
Member already occupying this flat:
Same member added twice to same flat
→ 400 already_occupying
Member with no active occupancy visits My Home:
→ Empty state: "No unit assigned yet"
→ "Contact your admin to get assigned"
Unit with no metadata (no BHK, floor, area):
Show what exists, skip missing fields
Never crash on missing metadata
Gatekeeper tries to view unit details:
→ 403 insufficient_permissions
Resident tries to view another member's flat:
→ 403 insufficient_permissions

### Ownership Security Rules
Self-assign to vacant flat: ALLOWED
  Builder assigns himself to unsold flats.
  Single admin assigns himself when no one else can.

Self-assign to flat with existing different owner: BLOCKED
  error: cannot_self_assign_occupied
  Prevents rogue admin silently adding themselves.

Duplicate ownership same person same flat: BLOCKED
  error: already_owner
  Prevents data corruption from double assignment.

Occupancy self-assignment: ALLOWED
  No restriction — caretakers and family members
  legitimately live in flats.
  
---

## Files To Create
apps/api/src/routes/units.ts
prisma/migrations/XXXXX_add_unit_assignment/
docs/briefs/unit-assignment.md  ← this file

## Files To Update
apps/api/src/app.ts          → register units router
prisma/schema.prisma         → ownedUntil field + enums
prisma/seed.ts               → unit permissions + role bundles
docs/API.md                  → all unit endpoints
docs/DECISIONS.md            → decisions 025-030
docs/MOBILE_CONTEXT.md       → new screens + endpoints

---

## Decision Log

### Decision 025 — ownedUntil added now for V2 readiness
**Date:** April 2026
**Decision:** Add ownedUntil to unit_ownerships now
even though ownership transfer UI is V2.
**Reason:** Adding field later requires migration.
Adding now costs nothing.
Enables full ownership history from day one.

### Decision 026 — Ownership and occupancy are separate records
**Date:** April 2026
**Decision:** Owner and occupant tracked independently.
One person can own a flat but not live there.
Another person can live there without owning it.
**Reason:** Reflects real Indian society reality.
Builder-owned rentals, tenant arrangements,
and investment properties are all common.

### Decision 027 — Deactivate does not end occupancy
**Date:** April 2026
**Decision:** Deactivating a member removes app access only.
Occupancy record untouched.
Only explicit moveout ends occupancy.
**Reason:** Deactivation is an app concern.
Physical occupancy is a real world fact.
These are independent concepts.

### Decision 028 — Multiple owners and occupants per flat
**Date:** April 2026
**Decision:** No hard limit on ownership or occupancy records per flat.
One marked isPrimary for display purposes.
**Reason:** Joint ownership and family arrangements
are standard in Indian residential societies.

### Decision 029 — Builder treated as any other owner
**Date:** April 2026
**Decision:** Builder ownership recorded same as any member.
No special UI treatment for builder-owned flats.
**Reason:** Keeps architecture consistent.
Admin can see all flats regardless of who owns them.

### Decision 030 — My Home shows primary flat on dashboard
**Date:** April 2026
**Decision:** Dashboard shows primary flat details only.
Full My Home screen shows all linked flats.
**Reason:** Dashboard must stay clean.
Members with multiple flats get full detail in My Home.

---

## Definition of Done
□ Migration runs cleanly — ownedUntil added
□ New enums in schema — OwnershipType, OccupancyType
□ New permissions seeded in all role bundles
□ POST /units/:nodeId/ownership — assign owner
□ DELETE /units/:nodeId/ownership/:id — end ownership
□ POST /units/:nodeId/occupancy — assign occupant
□ DELETE /units/:nodeId/occupancy/:id — end occupancy
□ GET /units/:nodeId — flat detail with owners + occupants
□ GET /units — all flats with vacancy status
□ GET /members/:memberId/units — member's flats
□ Assigning non-UNIT node blocked — 400
□ Double primary owner blocked — 400
□ Member not in society blocked — 404
□ Resident can only view own flats — enforced
□ Vacant flat tracking correct
□ Pending Setup → Active after assignment
□ API.md updated
□ DECISIONS.md updated
□ MOBILE_CONTEXT.md updated
□ Tests written — all cases covered
□ PR merged to dev

---

## Out of Scope
Ownership transfer UI
Non-app owner records
Bulk unit assignment
Maintenance charge calculation
Payment tracking
Unit documents or legal records
Floor plan upload