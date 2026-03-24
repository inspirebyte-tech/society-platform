# Feature Brief: Society Setup

## Overview
The first thing a builder does after registering.
Without this, nothing else in the platform works.
A society must exist before members, complaints,
visitors, or any other feature can function.

---

## Who Uses It
Builder — registers via OTP like any user, then creates a society as their first action.
   Role is assigned automatically when society is created.
---

## What It Does

### Part 1 — Create Society
Builder provides basic society information.
Society is created in the system.
Builder automatically gets full access.

### Part 2 — Add Structure
Builder defines the physical layout.
Towers, wings, floors, units — any combination.
Can be done immediately or over time.
Structure can be added to at any point.

### Part 3 — Invite Admin
Builder invites someone to be the society admin.
Invitation sent to phone number with chosen role.
Person registers via OTP — membership created automatically.
Builder can invite multiple admins with different roles.

---

## What It Does NOT Do
- No payment collection
- No document upload
- No builder to RWA handover (V2)
- No bulk unit import via CSV (V2)
- No floor plans or maps
- No automatic notifications to residents on society creation
- - No builder verification or approval process (V1)
     Anyone who registers can create a society.
     Builder verification added in V2.

---

## User Flows

### Flow 1 — Builder Creates Society
```
Builder opens app
→ Taps "Create New Society"
→ Fills:
    Society name         (required)
    Address line 1       (required)
    City                 (required)
    State                (required)
    Pincode              (required)
    Society type         (required)
      options: APARTMENT / VILLA / MIXED / PLOTTED
→ Taps "Create"
→ Society created
→ Builder lands on society dashboard
→ Society shows in builder's society list
```

### Flow 2 — Builder Adds Structure
```
Builder opens society dashboard
→ Taps "Manage Structure"
→ Sees current structure (empty at first)

Adding a Tower:
→ Taps "Add Tower/Wing"
→ Enters name (Tower A, Wing 1, Block B, etc)
→ Selects parent (society root or existing wing)
→ Tower added

Adding Units:
→ Selects a tower
→ Taps "Add Units"
→ Two options:
    Single unit:
      → Name/number, type (1BHK/2BHK/3BHK/VILLA/PLOT)
      → Floor number (optional)
      → Area in sqft (optional)
    Bulk add:
      → Number of units
      → Starting number (101, 201, etc)
      → Type (all same)
      → Floor (all same floor or auto-increment)
→ Units added under selected tower

Builder can repeat this for any structure.
No limit on depth or number of units.
```

### Flow 3 — Builder Invites Admin
```
Builder opens society dashboard
→ Taps "Members" or "Invite Someone"
→ Enters phone number
→ Selects role:
    Admin (full society management)
    Custom role (if any exist)
→ Taps "Send Invite"
→ Invitation created (expires in 7 days)
→ Invited person receives SMS
→ They register via OTP
→ Membership auto-created with selected role
→ They can now access the society
```

---

## Edge Cases

### Society Creation
```
Builder tries to create society with same name in same city
→ Allow it — two societies can have same name
→ They are separate organizations with separate IDs

Builder creates society and closes app before adding structure
→ Fine — structure can be added any time
→ Society exists with no units

Builder enters wrong address
→ Allow editing after creation
→ PATCH /societies/:id

Anyone can register and create a society in V1.
→ No gatekeeping on POST /societies.
→ Operational control only — builders are onboardedpersonally by Inspirebyte team.
→ V2 will add builder verification flow.
```

### Structure Management
```
Builder adds unit with duplicate number in same tower
→ Reject — unit numbers must be unique per tower
→ Return 400 with clear error

Builder tries to delete a tower that has units
→ Reject — cannot delete node with children
→ Must remove all units first
→ Return 400 with clear error

Builder tries to delete a unit that has an owner assigned
→ Reject — cannot delete unit with active ownership
→ Must remove ownership first
→ Return 400 with clear error

Society has no units added yet
→ Allowed — builder works at their own pace
→ Features that need units just return empty lists

Very large society (500+ units)
→ Bulk add handles this
→ No limit enforced in V1
```

### Admin Invitation
```
Builder invites phone that is already a member
→ Reject — already has access
→ Return 400 with clear error

Builder invites phone that has a pending invitation
→ Reject — invitation already exists
→ Return 400 with clear error

Invited person never registers
→ Invitation expires after 7 days
→ Builder can send new invitation
→ Old invitation marked expired

Builder invites wrong number
→ Builder can cancel pending invitation
→ DELETE /societies/:id/invitations/:invitationId

Builder wants to give custom permissions
→ Builder creates custom role first
→ Then invites with that custom role
→ Custom role creation is a separate flow (V1.5)
```

---

## Permissions Used
All permissions for this feature already exist in the DB.
See docs/PERMISSIONS.md for full list.

Key permissions for this feature:
society.create, society.update, society.view
node.create, node.update, node.delete, node.view
invitation.create, invitation.cancel, invitation.view

---

## API Contract


### POST /societies
Create a new society. Builder role assigned automatically.

**Auth:** Required (any logged in user)
**Permission:** society.create — but wait:
  This endpoint is special. No orgId exists yet.
  Permission check happens AFTER society is created.
  Middleware: authenticate only (no requirePermission)
  Membership created inside the handler itself.

**Request:**
```json
{
  "name":    "string, required",
  "address": "string, required",
  "city":    "string, required",
  "state":   "string, required",
  "pincode": "string, required",
  "type":    "APARTMENT | VILLA | MIXED | PLOTTED, required"
}
```

**Response 201:**
```json
{
  "data": {
    "id":      "uuid",
    "name":    "Green Valley Society",
    "address": "123 MG Road",
    "city":    "Pune",
    "state":   "Maharashtra",
    "pincode": "411001",
    "type":    "APARTMENT",
    "createdAt": "datetime"
  }
}
```

**Errors:**
```
400 missing_field     → required field not provided
                        details: { field: "name" }
400 invalid_type      → type not in allowed enum
```

**What happens internally:**
```
1. Validate all fields
2. Create organization row
3. Create SOCIETY property_node as root
4. Create membership for current user with Builder role
5. Return organization
All in one DB transaction — if any step fails, all roll back.
```

---

### GET /societies
List all societies where current user is an active member.

**Auth:** Required
**Permission:** None
**Note:** Special endpoint — ignores orgId in token.
  Queries ALL active memberships for current user.
  Returns every society they belong to across all orgs.


**Response 200:**
```json
{
  "data": [
    {
      "id":      "uuid",
      "name":    "Green Valley Society",
      "city":    "Pune",
      "type":    "APARTMENT",
      "role":    "Builder",
      "totalUnits": 48,
      "createdAt": "datetime"
    }
  ]
}
```

**Notes:**
```
Returns societies from memberships table
where userId = req.user.userId and isActive = true
Role shown is the user's role in that society
totalUnits = count of UNIT nodes in that org
```

---

### GET /societies/:id
Get full details of one society.

**Auth:** Required
**Permission:** society.view
**Scope:** orgId from token must match :id

**Response 200:**
```json
{
  "data": {
    "id":      "uuid",
    "name":    "Green Valley Society",
    "address": "123 MG Road",
    "city":    "Pune",
    "state":   "Maharashtra",
    "pincode": "411001",
    "type":    "APARTMENT",
    "isActive": true,
    "totalUnits": 48,
    "totalMembers": 12,
    "createdAt": "datetime"
  }
}
```

**Errors:**
```
403 insufficient_permissions → no society.view permission
404 not_found                → society doesn't exist
                               or user has no membership
```

---

### PATCH /societies/:id
Update society details.

**Auth:** Required
**Permission:** society.update

**Request:** (all fields optional — send only what changes)
```json
{
  "name":    "string, optional",
  "address": "string, optional",
  "city":    "string, optional",
  "state":   "string, optional",
  "pincode": "string, optional",
  "type":    "APARTMENT | VILLA | MIXED | PLOTTED, optional"
}
```

**Response 200:**
```json
{
  "data": {
    "id":      "uuid",
    "name":    "Green Valley Society",
    "address": "456 New Road",
    "city":    "Pune",
    "state":   "Maharashtra",
    "pincode": "411001",
    "type":    "APARTMENT",
    "updatedAt": "datetime"
  }
}
```

**Errors:**
```
400 missing_field            → if type provided but invalid value
403 insufficient_permissions → no society.update permission
404 not_found                → society doesn't exist
```

---

### GET /societies/:id/nodes
Get the full structure tree of a society.

**Auth:** Required
**Permission:** node.view

**Response 200:**
```json
{
  "data": {
    "id":       "uuid",
    "name":     "Green Valley",
    "nodeType": "SOCIETY",
    "children": [
      {
        "id":       "uuid",
        "name":     "Tower A",
        "code":     "TA",
        "nodeType": "TOWER",
        "children": [
          {
            "id":       "uuid",
            "name":     "Flat 101",
            "code":     "101",
            "nodeType": "UNIT",
            "metadata": {
              "bhk": "2BHK",
              "sqFt": 950,
              "floorNo": 1
            },
            "children": []
          }
        ]
      }
    ]
  }
}
```

**Notes:**
```
Returns nested tree structure
Built recursively from property_nodes table
Root node is the SOCIETY node
Each node has children array
Empty society returns root node with empty children
```

---

### POST /societies/:id/nodes
Add a single node (tower, wing, unit, etc).

**Auth:** Required
**Permission:** node.create

**Request:**
```json
{
  "parentId": "uuid, required — which node to add under",
  "nodeType": "TOWER | WING | FLOOR | UNIT | VILLA | PLOT | PHASE | BUILDING | BASEMENT | COMMON_AREA, required",
  "name":     "string, required",
  "code":     "string, required — unique within parent",
  "metadata": {
    "bhk":     "1BHK | 2BHK | 3BHK | 4BHK | VILLA | PLOT, optional",
    "sqFt":    "number, optional",
    "floorNo": "number, optional"
  }
}
```

**Response 201:**
```json
{
  "data": {
    "id":       "uuid",
    "orgId":    "uuid",
    "parentId": "uuid",
    "nodeType": "UNIT",
    "name":     "Flat 101",
    "code":     "101",
    "metadata": { "bhk": "2BHK", "sqFt": 950, "floorNo": 1 },
    "createdAt": "datetime"
  }
}
```

**Errors:**
```
400 missing_field        → required field not provided
400 invalid_node_type    → nodeType not in allowed enum
400 duplicate_code       → code already exists under same parent
400 invalid_parent       → parentId doesn't exist in this org
403 insufficient_permissions → no node.create permission
```

---

### POST /societies/:id/nodes/bulk
Add multiple units at once under a parent node.

**Auth:** Required
**Permission:** node.create

**Request:**
```json
{
  "parentId":     "uuid, required",
  "nodeType":     "UNIT | VILLA | PLOT, required",
  "count":        "number, required — how many to create",
  "startNumber":  "number, required — e.g. 101 creates 101,102,103",
  "prefix":       "string, optional — e.g. 'Flat' creates 'Flat 101'",
  "metadata": {
    "bhk":     "string, optional — same for all",
    "sqFt":    "number, optional — same for all",
    "floorNo": "number, optional — auto-increments if provided"
  }
}
```

**Response 201:**
```json
{
  "data": {
    "created": 10,
    "nodes": [
      { "id": "uuid", "name": "Flat 101", "code": "101" },
      { "id": "uuid", "name": "Flat 102", "code": "102" }
    ]
  }
}
```

**Errors:**
```
400 missing_field          → required field not provided
400 invalid_count          → count < 1 or count > 500
400 duplicate_code         → some codes already exist under parent
                             details: { existing: ["101", "102"] }
400 invalid_parent         → parentId doesn't exist in this org
403 insufficient_permissions → no node.create permission
```

---

### PATCH /societies/:id/nodes/:nodeId
Edit a node's details.

**Auth:** Required
**Permission:** node.update

**Request:** (all optional)
```json
{
  "name":     "string, optional",
  "code":     "string, optional",
  "metadata": "object, optional — merged with existing"
}
```

**Response 200:**
```json
{
  "data": {
    "id":       "uuid",
    "name":     "Flat 101 Updated",
    "code":     "101",
    "nodeType": "UNIT",
    "metadata": { "bhk": "3BHK", "sqFt": 1200, "floorNo": 1 },
    "updatedAt": "datetime"
  }
}
```

**Errors:**
```
400 duplicate_code       → new code already exists under same parent
403 insufficient_permissions → no node.update permission
404 not_found            → nodeId doesn't exist in this org
```

---

### DELETE /societies/:id/nodes/:nodeId
Remove a node from the structure.

**Auth:** Required
**Permission:** node.delete

**Response 200:**
```json
{
  "data": { "message": "node_deleted" }
}
```

**Errors:**
```
400 has_children         → node has child nodes, delete children first
400 has_active_ownership → unit has active owner assigned
400 has_active_occupancy → unit has active occupant assigned
403 insufficient_permissions → no node.delete permission
404 not_found            → nodeId doesn't exist in this org
```

---

### POST /societies/:id/invitations
Invite someone to the society.

**Auth:** Required
**Permission:** invitation.create

**Request:**
```json
{
  "phone":  "string, required",
  "roleId": "uuid, required — must be valid role in this org"
}
```

**Response 201:**
```json
{
  "data": {
    "id":        "uuid",
    "phone":     "+919999999999",
    "role":      "Resident",
    "expiresAt": "datetime",
    "createdAt": "datetime"
  }
}
```

**Errors:**
```
400 missing_field          → phone or roleId not provided
400 invalid_phone_format   → phone format invalid
400 already_member         → phone already has active membership
400 invitation_exists      → pending invitation already exists
                             for this phone in this org
400 invalid_role           → roleId doesn't exist or
                             not accessible in this org
403 insufficient_permissions → no invitation.create permission
```

**Notes:**
```
Phone normalized to +91 format before saving
Invitation expires in 7 days
When invited person registers via OTP →
invitation auto-accepted → membership created
SMS sent to invited phone (logged in dev)
```

---

### GET /societies/:id/invitations
List all pending invitations for this society.

**Auth:** Required
**Permission:** invitation.view

**Response 200:**
```json
{
  "data": [
    {
      "id":        "uuid",
      "phone":     "+919999999999",
      "role":      "Resident",
      "invitedBy": "Vikram Builder",
      "expiresAt": "datetime",
      "createdAt": "datetime"
    }
  ]
}
```

**Notes:**
```
Only returns pending invitations (acceptedAt IS NULL)
Expired invitations filtered out
```

---

### DELETE /societies/:id/invitations/:invitationId
Cancel a pending invitation.

**Auth:** Required
**Permission:** invitation.cancel

**Response 200:**
```json
{
  "data": { "message": "invitation_cancelled" }
}
```

**Errors:**
```
400 already_accepted     → invitation already accepted,
                           cannot cancel
403 insufficient_permissions → no invitation.cancel permission
404 not_found            → invitation doesn't exist in this org
```

---

## Summary Of All Endpoints
```
POST   /societies                           → create society
GET    /societies                           → list my societies
GET    /societies/:id                       → get society details
PATCH  /societies/:id                       → update society

GET    /societies/:id/nodes                 → get structure tree
POST   /societies/:id/nodes                 → add single node
POST   /societies/:id/nodes/bulk            → bulk add units
PATCH  /societies/:id/nodes/:nodeId         → edit node
DELETE /societies/:id/nodes/:nodeId         → delete node

POST   /societies/:id/invitations           → invite someone
GET    /societies/:id/invitations           → list invitations
DELETE /societies/:id/invitations/:invId    → cancel invitation
```


---

## Flow Diagram Needed
for structure management.
The parent-child relationship needs to be
visualised before frontend builds it.
See: docs/diagrams/society-structure-flow (to be created)

---

## Wireframes 
5 screens minimum:
1. Create society form
2. Society dashboard (after creation)
3. Structure management view
4. Add tower/unit form
5. Invite member form

---

## Definition of Done
□ Builder can create a society
□ Builder can add towers and units (single and bulk)
□ Builder can edit unit details
□ Builder can invite someone with any role
□ Invitation auto-accepts when person registers
□ Builder sees all their societies in a list
□ All error cases handled
□ All endpoints tested manually
□ API.md updated with new endpoints
□ PERMISSIONS.md updated with new permissions
□ PR merged to dev

---

## Out of Scope For This Feature
- Handover flow
- Custom role creation (V1.5)
- Bulk import via CSV
- Society settings/configuration panel
- Deleting a society
- Society analytics
```

---