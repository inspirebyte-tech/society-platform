# Feature Brief: Member Management

## Overview
After a society is set up and members are invited,
admin needs to view and manage who has access.
This feature gives admin full visibility and control
over society membership.

---

## Who Uses It
Builder — full access, can do everything
Admin — view members, deactivate, mark moved out
Resident — no access to member list
Gatekeeper — no access to member list

---

## What It Does

### View Members
Admin sees complete list of all active members.
Each member shows:
  Full name
  Phone number
  Role (Builder/Admin/Resident/Gatekeeper/Custom)
  Unit they're linked to (if assigned)
  Occupancy type (Owner/Tenant/Family/Caretaker)
  Joined date
  Active/inactive status

Members with no unit assigned shown separately
as "pending setup" — invited but not yet linked
to a flat.

### View One Member
Full details of one specific member.
Same fields as list plus:
  Invitation details (who invited them, when)
  Complete occupancy history

### Deactivate Member (remove app access)
Sets membership.isActive = false.
Member loses all app access immediately.
Their unit assignment and history preserved.
Used when: wrong person invited, temporary block.

### Mark As Moved Out
Sets membership.isActive = false
AND sets occupiedUntil = today on their occupancy.
Used when: tenant leaves, family member moves out.
Ownership NOT affected — owner still owns the flat.

### Reactivate Member
Sets membership.isActive = true.
Restores full app access.
Builder can reactivate anyone.
Admin can reactivate Residents and Gatekeepers only.
Admin cannot reactivate other Admins or Builder.

---

## What It Does NOT Do
- No ownership transfer (V2)
- No bulk member operations
- No member profile editing (name, phone changes)
- No community directory visible to residents (V2)
- No member messaging or chat
- No member analytics or reports

---

## User Flows

### Flow 1 — Admin Views Member List

Admin opens Members section
→ Sees list of all active members
→ Each row shows: name, role, unit, joined date
→ Can filter by role (All/Builder/Admin/Resident/Gatekeeper)
→ Can see "Pending Setup" section for members with no unit
→ Taps a member → goes to member detail screen

### Flow 2 — Admin Deactivates A Member

Admin opens member detail
→ Taps "Remove Access"
→ Confirmation dialog:
"This will remove [name]'s access to the society.
Their data will be preserved. Continue?"
→ Confirms
→ Member deactivated
→ Returns to member list
→ Member no longer appears in active list

### Flow 3 — Admin Marks Member As Moved Out

Admin opens member detail
→ Taps "Mark As Moved Out"
→ Confirmation dialog:
"This will remove [name]'s access and record
their move-out date. Continue?"
→ Confirms
→ Membership deactivated
→ Occupancy end dated
→ Flat becomes vacant

### Flow 4 — Builder Reactivates A Member

Builder opens Members section
→ Switches to "Inactive" tab
→ Sees deactivated members
→ Taps member
→ Taps "Reactivate"
→ Confirmation
→ Member regains access

---

## Edge Cases

Member has no unit assigned:
Show in "Pending Setup" section
Can still be deactivated
No occupancy to end date

Member is a Builder:
Cannot be deactivated by Admin
Only another Builder can deactivate a Builder
Prevents admin locking out builder

Reactivating member whose unit is now occupied:
Allow reactivation of membership
But occupancy is NOT auto-restored
Admin must manually reassign unit if needed
Show warning: "Note: unit assignment needs review"

Society has only one active Admin:
Allow deactivation (Builder still has access)
Show warning: "This is the only active admin"
Do not block — Builder can fix it

Member invited but never registered:
They appear as invitation, not membership
Handle in invitation endpoints (already built)
Not in member management

---

## Database Changes

No new tables needed.
No migrations needed.
Tables used:
memberships      → isActive flag for deactivation
unit_occupancies → occupiedUntil for move-out
people           → name, phone display
roles            → role name display
property_nodes   → unit details
audit_logs       → log every deactivation/reactivation

---

## Permissions Used

member.view    → GET /members, GET /members/:id
member.remove     → PATCH /members/:id/deactivate
                    PATCH /members/:id/moveout
member.reactivate → PATCH /members/:id/reactivate
(new permission — add to seed)

New permission to add to seed:
member.reactivate → Builder only
Admin does NOT get this

---

## API Endpoints Needed

### Members

GET   /societies/:id/members              → list members
GET   /societies/:id/members/:memberId    → one member
PATCH /societies/:id/members/:memberId/deactivate  → remove access
PATCH /societies/:id/members/:memberId/moveout     → mark moved out
PATCH /societies/:id/members/:memberId/reactivate  → restore access

---

## API Contract

### GET /societies/:id/members
List all members of a society.

**Auth:** Required
**Permission:** member.view
**Query params:**
  status=active (default) / inactive / all
  role=Builder/Admin/Resident/Gatekeeper (optional filter)

**Response 200:**
```json
{
  "data": {
    "active": [
      {
        "membershipId": "uuid",
        "userId":       "uuid",
        "name":         "Arjun Mehta",
        "phone":        "+919222222222",
        "role":         "Resident",
        "unit":         "Flat 4B",
        "unitId":       "uuid",
        "occupancyType": "OWNER_RESIDENT",
        "joinedAt":     "datetime",
        "isActive":     true
      }
    ],
    "pendingSetup": [
      {
        "membershipId": "uuid",
        "name":         "Ravi Kumar",
        "phone":        "+919555555555",
        "role":         "Resident",
        "unit":         null,
        "joinedAt":     "datetime"
      }
    ]
  }
}
```

**Errors**
401 no_token
403 insufficient_permissions
404 society_not_found
400 invalid_status → status not in allowed values
400 invalid_role   → role not in allowed values

---

### GET /societies/:id/members/:memberId
Get full details of one member.

**Auth:** Required
**Permission:** member.view

**Response 200:**
```json
{
  "data": {
    "membershipId":  "uuid",
    "userId":        "uuid",
    "name":          "Arjun Mehta",
    "phone":         "+919222222222",
    "role":          "Resident",
    "unit":          "Flat 4B",
    "unitId":        "uuid",
    "occupancyType": "OWNER_RESIDENT",
    "isPrimary":     true,
    "joinedAt":      "datetime",
    "invitedBy":     "Vikram Builder",
    "isActive":      true,
    "occupancyHistory": [
      {
        "unitName":     "Flat 4B",
        "from":         "datetime",
        "until":        null,
        "type":         "OWNER_RESIDENT"
      }
    ]
  }
}
```

**Errors:**
401 no_token
403 insufficient_permissions
404 society_not_found
404 member_not_found

---

### PATCH /societies/:id/members/:memberId/deactivate
Remove app access only.

**Auth:** Required
**Permission:** member.remove

**Request:** no body needed

**Response 200:**
```json
{ "data": { "message": "member_deactivated" } }
```

**Errors:**
400 cannot_deactivate_self    → cannot remove yourself
400 cannot_deactivate_builder → admin cannot deactivate builder
404 member_not_found
403 insufficient_permissions

---

### PATCH /societies/:id/members/:memberId/moveout
Remove access AND end occupancy.

**Auth:** Required
**Permission:** member.remove

**Request:** no body needed

**Response 200:**
```json
{ "data": { "message": "member_moved_out" } }
```

**Errors:**
400 cannot_deactivate_self
400 cannot_deactivate_builder
400 no_active_occupancy → member has no occupancy to end
404 member_not_found
403 insufficient_permissions

---

### PATCH /societies/:id/members/:memberId/reactivate
Restore app access.

**Auth:** Required
**Permission:** member.reactivate

**Response 200:**
```json
{
  "data": {
    "message": "member_reactivated",
    "warning": "Unit assignment may need review"
  }
}
```
**Notes**
Warning only included in response when member previously had an occupancy record that was ended (moved out scenario). Not shown for simple deactivate/reactivate.

**Errors:**
400 already_active    → member is already active
404 member_not_found
403 insufficient_permissions
400 cannot_reactivate_builder → admin cannot
    reactivate a builder (only builder can)
---

## New Permission To Add To Seed

Open `prisma/seed.ts` and:

1. Add to permissions array:
```typescript
{ name: 'member.reactivate', module: 'members',
  description: 'Reactivate a deactivated member' },
```

2. Add to Builder role bundle only:
```typescript
Builder: [
  // ... existing permissions ...
  'member.reactivate',  // ← add this
]
```

Admin does NOT get member.reactivate.

Then run:
```bash
npx prisma migrate reset
```

---

## Audit Logging

Every deactivation and reactivation must be logged:
```typescript
await prisma.auditLog.create({
  data: {
    orgId:     id,
    tableName: 'memberships',
    recordId:  memberId,
    action:    'deactivate', // or 'moveout' or 'reactivate'
    actorId:   req.user!.userId,
    oldData:   { isActive: true },
    newData:   { isActive: false }
  }
})
```

This is what allows answering:
"Who deactivated this member and when?"

---

## Flow Diagram Needed?
No — flows are straightforward enough.
No complex state machine involved.

## Wireframes Needed?
Yes — 3 screens:
1. Member list screen (active + pending setup tabs)
2. Member detail screen
3. Confirm deactivation dialog

Assign to Dev 2 after this brief is reviewed.

---

## Definition of Done
□ GET /members returns active and pending setup members
□ GET /members/:id returns full member details
□ PATCH /deactivate removes access, preserves data
□ PATCH /moveout removes access AND ends occupancy
□ PATCH /reactivate restores access
□ Admin cannot deactivate Builder — blocked
□ Admin cannot deactivate themselves — blocked
□ Admin cannot reactivate — blocked (403)
□ Every action logged in audit_logs
□ All error cases handled
□ All endpoints tested manually
□ API.md updated
□ PR merged to dev

---

## Out of Scope
- Ownership transfer
- Bulk member operations
- Member profile editing
- Community directory
- Member messaging