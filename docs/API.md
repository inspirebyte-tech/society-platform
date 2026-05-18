# API Documentation

## Base URL
```
Local: http://localhost:3000/api
```

## Authentication
All protected routes require:
```
Header: Authorization: Bearer YOUR_TOKEN
```

Two token types:
```
Auth token    → no orgId, returned after login
               can only access /auth/select-org
Session token → has orgId, returned after select-org
               required for all feature routes
```

---

## Auth Endpoints

### POST /auth/request-otp
Request an OTP to be sent to a phone number.

**Auth required:** No
**Rate limit:** 3 requests per hour per IP

**Request:**
```json
{ "phone": "9999999999" }
```
Accepts both formats: `9999999999` or `+919999999999`

**Response 200:**
```json
{
  "data": {
    "message": "otp_sent",
    "phone": "+919999999999",
    "expiresIn": 600
  }
}
```

**Errors:**
```
400 missing_field        → phone not provided
400 invalid_phone_format → phone format invalid
429 otp_rate_limit_exceeded → too many requests
```

---

### POST /auth/verify-otp
Verify OTP and receive authentication tokens.

**Auth required:** No

**Request:**
```json
{
  "phone": "9999999999",
  "otp": "482910"
}
```

**Response 200 — new user, no society:**
```json
{
  "data": {
    "token": "eyJ...",
    "refreshToken": "eyJ...",
    "isNewUser": true,
    "memberships": [],
    "message": "no_society_joined"
  }
}
```

**Response 200 — one society:**
```json
{
  "data": {
    "token": "eyJ...",
    "refreshToken": "eyJ...",
    "isNewUser": false,
    "currentOrg": {
      "id": "uuid",
      "name": "Green Valley Society",
      "role": "Resident"
    }
  }
}
```

**Response 200 — multiple societies:**
```json
{
  "data": {
    "token": "eyJ...",
    "refreshToken": "eyJ...",
    "isNewUser": false,
    "requiresOrgSelection": true,
    "memberships": [
      { "orgId": "uuid", "orgName": "Green Valley", "role": "Admin" },
      { "orgId": "uuid", "orgName": "Sunrise Towers", "role": "Resident" }
    ]
  }
}
```

**Errors:**
```
400 missing_field    → phone or otp not provided
400 invalid_otp      → wrong code, attemptsRemaining in details
400 otp_expired      → code older than 10 minutes
400 otp_not_found    → no pending OTP for this phone
400 otp_blocked      → 3 wrong attempts, request new OTP
```

---

### POST /auth/select-org
Select a society to get a session token with org context.

**Auth required:** Yes (auth token, no orgId needed)

**Request:**
```json
{ "orgId": "uuid" }
```

**Response 200:**
```json
{
  "data": {
    "token": "eyJ...",
    "currentOrg": {
      "id": "uuid",
      "name": "Green Valley Society",
      "role": "Admin"
    }
  }
}
```

**Errors:**
```
400 missing_field → orgId not provided
401 no_token      → no Authorization header
403 not_a_member  → user has no membership in this org
```

---

### GET /auth/me
Get full user context including all memberships and permissions.

**Auth required:** Yes (session token with orgId)

**Response 200:**
```json
{
  "data": {
    "user": {
      "id": "uuid",
      "phone": "+919999999999",
      "name": "Vikram Shah",
      "isProfileComplete": true
    },
    "memberships": [
      {
        "org": { "id": "uuid", "name": "Green Valley Society" },
        "role": "Builder",
        "permissions": ["society.create", "node.create", "..."]
      }
    ]
  }
}
```

**Errors:**
```
401 no_token      → no Authorization header
401 invalid_token → token expired or invalid
404 user_not_found → valid token but user deleted
```

---

### POST /auth/refresh
Get a new session token using a refresh token.

**Auth required:** No

**Request:**
```json
{ "refreshToken": "eyJ..." }
```

**Response 200:**
```json
{
  "data": {
    "token": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

**Errors:**
```
400 missing_field         → refreshToken not provided
401 invalid_refresh_token → token invalid or expired
401 user_not_found        → user deactivated
```

---

### PATCH /auth/profile
Update current user's display name.

**Auth:** Required

**Request:**
```json
{ "name": "Arjun Mehta" }
```

**Response 200:**
```json
{
  "data": {
    "name": "Arjun Mehta",
    "isProfileComplete": true
  }
}
```

**Errors:**
```
400 missing_field  → name not provided
400 invalid_name   → name less than 2 characters
401 no_token       → not logged in
404 profile_not_found → user has no person record
```

---

### POST /auth/logout
Logout current session.

**Auth required:** Yes

**Response 200:**
```json
{ "data": { "message": "logged_out" } }
```

**Note:** JWT is stateless. Client must delete token
from storage. Token remains technically valid until
expiry — future Redis blacklist will fix this.

**Errors:**
```
401 no_token → no Authorization header
```

### POST /auth/device-token
Register device push notification token.

**Auth:** Required (any logged in user)

**Request:**
```json
{
  "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "platform": "ANDROID"
}
```

**Response 200:**
```json
{
  "data": { "registered": true }
}
```

**Errors:**
```
400 missing_field    → token or platform not provided
400 invalid_platform → platform not IOS or ANDROID
401 no_token         → not logged in
```

---

## Standard Error Format

All errors follow this format:
```json
{
  "error": "snake_case_error_code",
  "details": { "field": "phone" }
}
```

`details` is optional — only present when extra context helps.

---

## Standard Success Format

All success responses follow this format:
```json
{ "data": { ... } }
```

---

## HTTP Status Codes Used
```
200 → success
201 → created
400 → bad request / validation error
401 → not authenticated
403 → authenticated but not authorized
404 → not found
429 → rate limited
500 → server error
```

---

## Society Endpoints

### POST /societies
Create a new society. Builder role assigned automatically.

**Auth required:** Yes (any logged in user)
**Permission:** None — authenticate only
**Note:** Special endpoint. No orgId exists yet.
Transaction creates org + root node + membership atomically.

**Request:**
```json
{
  "name":    "Green Valley Society",
  "address": "123 MG Road",
  "city":    "Pune",
  "state":   "Maharashtra",
  "pincode": "411001",
  "type":    "APARTMENT"
}
```

Type must be one of: `APARTMENT` `VILLA` `MIXED` `PLOTTED`

**Response 201:**
```json
{
  "data": {
    "id":        "uuid",
    "name":      "Green Valley Society",
    "address":   "123 MG Road",
    "city":      "Pune",
    "state":     "Maharashtra",
    "pincode":   "411001",
    "type":      "APARTMENT",
    "createdAt": "datetime"
  }
}
```

**Errors:**
```
400 missing_field → any required field not provided
                    details: { field: "name" }
400 invalid_type  → type not in allowed enum
                    details: { allowed: [...] }
401 no_token      → not logged in
```

---

### GET /societies
List all societies for the current user.

**Auth required:** Yes
**Permission:** None — any logged in user
**Note:** Ignores orgId in token. Returns all societies
across all memberships for this user.

**Response 200:**
```json
{
  "data": [
    {
      "id":         "uuid",
      "name":       "Green Valley Society",
      "city":       "Pune",
      "type":       "APARTMENT",
      "role":       "Builder",
      "totalUnits": 48,
      "createdAt":  "datetime"
    }
  ]
}
```

**Errors:**
```
401 no_token → not logged in
```

---

### GET /societies/:id
Get full details of one society.

**Auth required:** Yes
**Permission:** society.view

**Response 200:**
```json
{
  "data": {
    "id":           "uuid",
    "name":         "Green Valley Society",
    "address":      "123 MG Road",
    "city":         "Pune",
    "state":        "Maharashtra",
    "pincode":      "411001",
    "type":         "APARTMENT",
    "isActive":     true,
    "totalUnits":   48,
    "totalMembers": 12,
    "createdAt":    "datetime"
  }
}
```

**Errors:**
```
401 no_token                  → not logged in
403 insufficient_permissions  → no society.view permission
404 society_not_found         → society doesn't exist
                                or user has no membership
```

---

### PATCH /societies/:id
Update society details. All fields optional.

**Auth required:** Yes
**Permission:** society.update

**Request:** (send only fields to change)
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
    "id":        "uuid",
    "name":      "Green Valley Society",
    "address":   "123 MG Road",
    "city":      "Pune",
    "state":     "Maharashtra",
    "pincode":   "411001",
    "type":      "APARTMENT",
    "updatedAt": "datetime"
  }
}
```

**Errors:**
```
400 invalid_type          → type not in allowed enum
400 no_fields_provided    → empty request body
401 no_token              → not logged in
403 insufficient_permissions → no society.update permission
404 society_not_found     → society doesn't exist
```

---

## Node Endpoints (Structure Management)

### GET /societies/:id/nodes
Get the full structure tree of a society.

**Auth required:** Yes
**Permission:** node.view
**Note:** Single DB query. Tree built in memory.

**Response 200:**
```json
{
  "data": {
    "id":       "uuid",
    "name":     "Green Valley",
    "code":     "GRE",
    "nodeType": "SOCIETY",
    "parentId": null,
    "metadata": {},
    "children": [
      {
        "id":       "uuid",
        "name":     "Tower A",
        "code":     "TA",
        "nodeType": "TOWER",
        "parentId": "uuid",
        "metadata": {},
        "children": [
          {
            "id":       "uuid",
            "name":     "Flat 101",
            "code":     "101",
            "nodeType": "UNIT",
            "parentId": "uuid",
            "metadata": { "bhk": "2BHK", "sqFt": 950, "floorNo": 1 },
            "children": []
          }
        ]
      }
    ]
  }
}
```

**Errors:**
```
401 no_token                  → not logged in
403 insufficient_permissions  → no node.view permission
404 society_not_found         → society doesn't exist
```

---

### POST /societies/:id/nodes
Add a single node to the structure.

**Auth required:** Yes
**Permission:** node.create

**Request:**
```json
{
  "parentId": "uuid",
  "nodeType": "TOWER",
  "name":     "Tower B",
  "code":     "TB",
  "metadata": {
    "bhk":     "2BHK",
    "sqFt":    950,
    "floorNo": 1
  }
}
```

nodeType must be one of:
`SOCIETY` `TOWER` `WING` `FLOOR` `UNIT`
`COMMON_AREA` `PHASE` `BUILDING` `VILLA` `PLOT` `BASEMENT`

metadata is optional. Used for units to store BHK type, area, floor.

**Response 201:**
```json
{
  "data": {
    "id":        "uuid",
    "orgId":     "uuid",
    "parentId":  "uuid",
    "nodeType":  "TOWER",
    "name":      "Tower B",
    "code":      "TB",
    "metadata":  {},
    "createdAt": "datetime"
  }
}
```

**Errors:**
```
400 missing_field     → required field not provided
400 invalid_node_type → nodeType not in allowed list
400 invalid_parent    → parentId doesn't exist in this society
400 duplicate_code    → code already exists under same parent
                        details: { message: "..." }
401 no_token          → not logged in
403 insufficient_permissions → no node.create permission
404 society_not_found → society doesn't exist
```

---

### POST /societies/:id/nodes/bulk
Add multiple units at once.

**Auth required:** Yes
**Permission:** node.create

**Request:**
```json
{
  "parentId":    "uuid",
  "nodeType":    "UNIT",
  "count":       10,
  "startNumber": 101,
  "prefix":      "Flat",
  "metadata": { "bhk": "2BHK" }
}
```

`prefix` is optional. With prefix "Flat" and startNumber 101:
creates Flat 101, Flat 102... Max count: 500.

**Response 201:**
```json
{
  "data": {
    "created": 10,
    "nodes": [
      { "id": "uuid", "name": "Flat 101", "code": "101", "nodeType": "UNIT" },
      { "id": "uuid", "name": "Flat 102", "code": "102", "nodeType": "UNIT" }
    ]
  }
}
```

**Errors:**
```
400 missing_field     → required field not provided
400 invalid_count     → count < 1 or count > 500
400 invalid_node_type → nodeType not in allowed list
400 invalid_parent    → parentId doesn't exist in this society
400 duplicate_code    → some codes already exist
                        details: { existing: ["101", "102"] }
401 no_token          → not logged in
403 insufficient_permissions → no node.create permission
404 society_not_found → society doesn't exist
```

---

### PATCH /societies/:id/nodes/:nodeId
Edit a node's details. All fields optional.

**Auth required:** Yes
**Permission:** node.update

**Request:** (send only fields to change)
```json
{
  "name":     "string, optional",
  "code":     "string, optional",
  "metadata": "object, optional — merged with existing metadata"
}
```

**Response 200:**
```json
{
  "data": {
    "id":        "uuid",
    "name":      "Flat 101",
    "code":      "101",
    "nodeType":  "UNIT",
    "metadata":  { "bhk": "3BHK", "sqFt": 1200 },
    "updatedAt": "datetime"
  }
}
```

**Errors:**
```
400 duplicate_code        → new code already exists under same parent
400 no_fields_provided    → empty request body
401 no_token              → not logged in
403 insufficient_permissions → no node.update permission
404 society_not_found     → society doesn't exist
404 node_not_found        → node doesn't exist in this society
```

---

### DELETE /societies/:id/nodes/:nodeId
Remove a node from the structure.

**Auth required:** Yes
**Permission:** node.delete
**Note:** Soft delete — isActive set to false. Data preserved.

**Response 200:**
```json
{ "data": { "message": "node_deleted" } }
```

**Errors:**
```
400 has_children          → node has child nodes
                            details: { message: "Remove all N child nodes first" }
400 has_active_ownership  → unit has active owner assigned
400 has_active_occupancy  → unit has active occupant assigned
401 no_token              → not logged in
403 insufficient_permissions → no node.delete permission
404 society_not_found     → society doesn't exist
404 node_not_found        → node doesn't exist in this society
```

---

## Invitation Endpoints

### POST /societies/:id/invitations
Invite someone to the society.

**Auth required:** Yes
**Permission:** invitation.create

**Request:**
```json
{
  "phone":  "9876543210",
  "roleId": "role-resident"
}
```

Phone accepts both formats: `9876543210` or `+919876543210`
roleId must be a valid system or custom role for this society.

**Response 201:**
```json
{
  "data": {
    "id":        "uuid",
    "phone":     "+919876543210",
    "role":      "Resident",
    "expiresAt": "datetime",
    "createdAt": "datetime"
  }
}
```

**What happens next:**
SMS sent to invited phone. When they register via OTP →
invitation auto-accepted → membership created automatically.

**Errors:**
```
400 missing_field      → phone or roleId not provided
400 invalid_phone_format → phone format invalid
400 invalid_role       → roleId doesn't exist or not accessible
400 already_member     → phone already has active membership
400 invitation_exists  → pending invitation already exists
401 no_token           → not logged in
403 insufficient_permissions → no invitation.create permission
404 society_not_found  → society doesn't exist
```

---

### GET /societies/:id/invitations
List all pending invitations for this society.

**Auth required:** Yes
**Permission:** invitation.view
**Note:** Only returns pending invitations
(not accepted, not expired).

**Response 200:**
```json
{
  "data": [
    {
      "id":        "uuid",
      "phone":     "+919876543210",
      "role":      "Resident",
      "invitedBy": "Vikram Builder",
      "expiresAt": "datetime",
      "createdAt": "datetime"
    }
  ]
}
```

**Errors:**
```
401 no_token                  → not logged in
403 insufficient_permissions  → no invitation.view permission
404 society_not_found         → society doesn't exist
```

---

### DELETE /societies/:id/invitations/:invitationId
Cancel a pending invitation.

**Auth required:** Yes
**Permission:** invitation.cancel

**Response 200:**
```json
{ "data": { "message": "invitation_cancelled" } }
```

**Errors:**
```
400 already_accepted          → invitation already accepted
401 no_token                  → not logged in
403 insufficient_permissions  → no invitation.cancel permission
404 society_not_found         → society doesn't exist
404 invitation_not_found      → invitation doesn't exist
```

---

## Member Endpoints

### GET /societies/:id/members
List all members of a society.

**Auth:** Required
**Permission:** member.view
**Query params:**
  status=active (default) / inactive / all
  role=Builder/Admin/Resident/Gatekeeper (optional)

**Response 200:**
```json
{
  "data": {
    "active": [
      {
        "membershipId":  "uuid",
        "userId":        "uuid",
        "name":          "Arjun Mehta",
        "phone":         "+919222222222",
        "role":          "Resident",
        "unit":          "Flat 4B",
        "unitId":        "uuid",
        "occupancyType": "OWNER_RESIDENT",
        "joinedAt":      "datetime",
        "isActive":      true
      }
    ],
    "pendingSetup": [
      {
        "membershipId": "uuid",
        "name":         "Vikram Builder",
        "phone":        "+919111111111",
        "role":         "Builder",
        "unit":         null,
        "unitId":       null,
        "occupancyType": null,
        "joinedAt":     "datetime",
        "isActive":     true
      }
    ]
  }
}
```

**Errors:**
400 invalid_status           → status not in allowed values
401 no_token                 → not logged in
403 insufficient_permissions → no member.view permission
403 tenant_context_mismatch  → wrong society context
404 society_not_found        → society doesn't exist

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
        "unitName": "Flat 4B",
        "from":     "datetime",
        "until":    null,
        "type":     "OWNER_RESIDENT"
      }
    ]
  }
}
```

**Errors:**
401 no_token                 → not logged in
403 insufficient_permissions → no member.view permission
403 tenant_context_mismatch  → wrong society context
404 member_not_found         → member doesn't exist

---

### PATCH /societies/:id/members/:memberId/deactivate
Remove app access. Occupancy and ownership preserved.

**Auth:** Required
**Permission:** member.remove

**Response 200:**
```json
{ "data": { "message": "member_deactivated" } }
```

**Response 200 (last admin warning):**
```json
{
  "data": {
    "message": "member_deactivated",
    "warning": "This was the only active Admin. Builder still has access."
  }
}
```

**Errors:**
400 cannot_deactivate_self    → cannot remove yourself
400 cannot_deactivate_builder → only Builder can deactivate Builder
400 already_inactive          → member already deactivated
401 no_token
403 insufficient_permissions
403 tenant_context_mismatch
404 member_not_found

---

### PATCH /societies/:id/members/:memberId/moveout
Remove access AND end occupancy. Ownership NOT affected.

**Auth:** Required
**Permission:** member.remove

**Response 200:**
```json
{ "data": { "message": "member_moved_out" } }
```

**Errors:**
400 cannot_deactivate_self    → cannot mark yourself as moved out
400 cannot_deactivate_builder → only Builder can remove Builder
400 no_active_occupancy       → member has no active occupancy to end
401 no_token
403 insufficient_permissions
403 tenant_context_mismatch
404 member_not_found

---

### PATCH /societies/:id/members/:memberId/reactivate
Restore app access. Builder only.

**Auth:** Required
**Permission:** member.reactivate

**Response 200:**
```json
{ "data": { "message": "member_reactivated" } }
```

**Response 200 (with warning):**
```json
{
  "data": {
    "message": "member_reactivated",
    "warning": "Member reactivated. Unit assignment may need review."
  }
}
```

**Note:** Warning shown when member previously had
an occupancy that was ended (moved out scenario).

**Errors:**
400 already_active    → member is already active
401 no_token
403 insufficient_permissions → Admin cannot reactivate
403 tenant_context_mismatch
404 member_not_found


### POST /societies/:id/complaints
Raise a new complaint.

**Auth:** Required
**Permission:** complaint.create (Resident, Co-resident only)

**Request:**
```json
{
  "title": "Lift not working since 2 days",
  "description": "Tower A lift is completely out of service.",
  "category": "LIFT_ELEVATOR",
  "visibility": "PUBLIC",
  "images": []
}
```

**Categories:**
WATER_SUPPLY, ELECTRICITY, LIFT_ELEVATOR, GENERATOR,
INTERNET_CABLE, PARKING, GARBAGE_WASTE, GARDEN_LANDSCAPING,
GYM_CLUBHOUSE, SWIMMING_POOL, SECURITY, NOISE, PET_RELATED,
DOMESTIC_HELP, NEIGHBOUR_BEHAVIOUR, STAFF_BEHAVIOUR,
MAINTENANCE_REPAIR, RULE_VIOLATION, OTHER

**Response 201:**
```json
{
  "data": {
    "id": "uuid",
    "title": "Lift not working since 2 days",
    "category": "LIFT_ELEVATOR",
    "visibility": "PUBLIC",
    "status": "OPEN",
    "imageCount": 0,
    "createdAt": "datetime"
  }
}
```

**Errors:**
400 missing_field           → title, description or category missing
400 invalid_category        → category not in allowed values
400 invalid_visibility      → visibility not PUBLIC or PRIVATE
400 too_many_images         → more than 5 images provided
400 image_upload_failed     → Cloudinary upload error
403 insufficient_permissions → admin/builder trying to raise
401 no_token                → not logged in

---

### GET /societies/:id/complaints
List complaints.

**Auth:** Required

**Query params:**
status   → OPEN, RESOLVED, REJECTED
category → any valid category
page     → default 1
limit    → default 20, max 50

**Behaviour:**
Admin/Builder → sees all complaints, raisedBy always shown
Resident/Co-resident → sees own + public complaints
  raisedBy hidden on other residents' public complaints

**Response 200:**
```json
{
  "data": {
    "complaints": [
      {
        "id": "uuid",
        "title": "Lift not working since 2 days",
        "category": "LIFT_ELEVATOR",
        "visibility": "PUBLIC",
        "status": "OPEN",
        "raisedBy": "Arjun Mehta",
        "raisedByMe": true,
        "imageCount": 0,
        "createdAt": "datetime"
      }
    ],
    "total": 1,
    "page": 1,
    "pages": 1
  }
}
```

---

### GET /societies/:id/complaints/:complaintId
Complaint detail.

**Auth:** Required

**Behaviour:**
Admin/Builder → any complaint
Resident → own + public only
Private complaint from others → 404 complaint_not_found

**Response 200:**
```json
{
  "data": {
    "id": "uuid",
    "title": "Lift not working since 2 days",
    "description": "Full description here",
    "category": "LIFT_ELEVATOR",
    "visibility": "PUBLIC",
    "status": "OPEN",
    "rejectionReason": null,
    "raisedBy": {
      "name": "Arjun Mehta",
      "phone": "+919222222222"
    },
    "resolvedBy": null,
    "resolvedAt": null,
    "images": [
      { "id": "uuid", "imageUrl": "https://res.cloudinary.com/..." }
    ],
    "createdAt": "datetime",
    "updatedAt": "datetime"
  }
}
```

**Errors:**
404 complaint_not_found → not found or no access
401 no_token            → not logged in

---

### PATCH /societies/:id/complaints/:complaintId
Update complaint status.

**Auth:** Required

**Request — resolve:**
```json
{ "status": "RESOLVED" }
```

**Request — reject (admin only):**
```json
{
  "status": "REJECTED",
  "rejectionReason": "Duplicate complaint"
}
```

**Response 200:**
```json
{
  "data": {
    "id": "uuid",
    "status": "RESOLVED",
    "resolvedAt": "datetime",
    "resolvedBy": "Vikram Builder"
  }
}
```

**Errors:**
400 missing_field            → status not provided
400 invalid_status           → not RESOLVED or REJECTED
400 already_resolved         → complaint already resolved
400 already_rejected         → complaint already rejected
400 rejection_reason_required → rejected without reason
403 insufficient_permissions  → resident trying to reject
403 cannot_resolve_others     → resident resolving others' complaint
404 complaint_not_found       → complaint not found
401 no_token                  → not logged in

## Unit Assignment

### GET /api/societies/:id/units
List all units with occupancy status.

**Auth:** Required
**Permission:** unit.view_all

**Query params:**
- `status` — `vacant` | `occupied` | `all` (default: all)

**Response 200:**
```json
{
  "data": {
    "units": [
      {
        "id": "uuid",
        "name": "Flat 4B",
        "code": "4B",
        "path": "Tower A → Wing 1",
        "metadata": {},
        "isVacant": false,
        "primaryOwner": "Arjun Mehta",
        "primaryOccupant": "Arjun Mehta",
        "occupancyType": "OWNER_RESIDENT"
      }
    ],
    "total": 48,
    "occupied": 36,
    "vacant": 12
  }
}
```

---

### GET /api/societies/:id/units/:nodeId
Get full unit detail — owners, occupants, history.

**Auth:** Required
**Permission:** unit.view_all OR unit.view_own (own flat only)

**Response 200:**
```json
{
  "data": {
    "id": "uuid",
    "name": "Flat 4B",
    "code": "4B",
    "path": "Tower A → Wing 1",
    "floor": 4,
    "bhk": "2BHK",
    "area": 950,
    "isVacant": false,
    "owners": [
      {
        "id": "uuid",
        "name": "Arjun Mehta",
        "phone": "+919222222222",
        "ownershipType": "PRIMARY_OWNER",
        "isPrimary": true,
        "ownedFrom": "datetime"
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

### POST /api/societies/:id/units/:nodeId/ownership
Assign ownership of a unit to a member.

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

**Ownership types:** PRIMARY_OWNER, CO_OWNER

**Response 201:**
```json
{
  "data": {
    "id": "uuid",
    "flatName": "Flat 4B",
    "member": { "name": "Arjun Mehta", "phone": "+919222222222" },
    "ownershipType": "PRIMARY_OWNER",
    "isPrimary": true,
    "ownedFrom": "datetime"
  }
}
```

**Errors:**
400 missing_field          → userId or ownershipType missing
400 invalid_ownership_type → not PRIMARY_OWNER or CO_OWNER
400 not_a_unit             → nodeId is not a UNIT type node
400 already_has_primary    → flat already has a primary owner
404 node_not_found         → flat not found in this society
404 member_not_found       → userId not a member of this society
403 insufficient_permissions

---

### DELETE /api/societies/:id/units/:nodeId/ownership/:ownershipId
End ownership (sets ownedUntil = today).

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
400 already_ended       → ownership already ended
404 ownership_not_found → record not found

---

### POST /api/societies/:id/units/:nodeId/occupancy
Assign occupancy of a unit to a member.

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

**Occupancy types:** OWNER_RESIDENT, TENANT, FAMILY, CARETAKER

**Response 201:**
```json
{
  "data": {
    "id": "uuid",
    "flatName": "Flat 4B",
    "member": { "name": "Arjun Mehta", "phone": "+919222222222" },
    "occupancyType": "OWNER_RESIDENT",
    "isPrimary": true,
    "occupiedFrom": "datetime"
  }
}
```

**Errors:**
400 missing_field          → userId or occupancyType missing
400 invalid_occupancy_type → not a valid occupancy type
400 not_a_unit             → nodeId is not a UNIT type node
400 already_has_primary    → flat already has a primary occupant
400 already_occupying      → member already occupying this flat
404 node_not_found
404 member_not_found
403 insufficient_permissions

---

### DELETE /api/societies/:id/units/:nodeId/occupancy/:occupancyId
End occupancy (sets occupiedUntil = today).

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

**Errors:**
400 already_ended        → occupancy already ended
404 occupancy_not_found  → record not found

---

### GET /api/societies/:id/members/:memberId/units
Get all units linked to a member. Used for My Home screen.

**Auth:** Required
**Permission:** unit.view_all OR unit.view_own (own membership only)

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
          { "name": "Meera Mehta", "ownershipType": "CO_OWNER" }
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
          { "name": "Meera Mehta", "occupancyType": "FAMILY" }
        ]
      }
    ]
  }
}
```


## Announcements

### POST /api/societies/:id/announcements
Create announcement. Builder/Admin only.

**Permission:** announcement.create

**Request:**
```json
{
  "title": "Water supply cut tomorrow",
  "body": "Water supply will be cut from 9am to 12pm tomorrow for maintenance.",
  "category": "MAINTENANCE",
  "images": ["base64..."]
}
```

**Categories:** GENERAL, MAINTENANCE, MEETING, EMERGENCY, CELEBRATION

**Response 201:** announcement object with images and creator

---

### GET /api/societies/:id/announcements
List all announcements. Pinned first, then newest.

**Permission:** announcement.view

**Query params:** category (optional filter)

**Response 200:** { announcements: [...] }

---

### GET /api/societies/:id/announcements/:announcementId
Get full announcement detail.

**Permission:** announcement.view

**Response 200:** full announcement with images and creator

---

### PATCH /api/societies/:id/announcements/:announcementId/pin
Toggle pin. Max 3 pinned at a time.

**Permission:** announcement.pin

**Errors:**
400 max_pinned_reached → already 3 pinned
404 announcement_not_found

---

### DELETE /api/societies/:id/announcements/:announcementId
Hard delete announcement and images.

**Permission:** announcement.delete

**Response 200:** { message: 'announcement_deleted' }

---

## Visitor Management

### POST /api/societies/:id/visitors/search
Search visitors and pre-approvals by name or mobile.

**Permission:** visitor.log

**Request:**
```json
{ "name": "Ravi" }
```
or
```json
{ "mobile": "9876543210" }
```

**Response 200:**
```json
{
  "data": {
    "visitors": [
      {
        "id": "uuid", "name": "Ravi Kumar", "mobile": "+919876543210",
        "type": "INDIVIDUAL", "photoUrl": null,
        "isFrequent": true, "frequentForUnitId": "uuid", "frequentFlatName": "Flat 4B"
      }
    ],
    "preApprovals": [
      {
        "id": "uuid", "visitorName": "Ravi Kumar", "visitorMobile": "+919876543210",
        "unitId": "uuid", "flatName": "Flat 4B", "note": "plumber",
        "expiresAt": null, "isUsed": false, "createdAt": "datetime"
      }
    ]
  }
}
```

---

### POST /api/societies/:id/visitors
Create a new visitor record.

**Permission:** visitor.log

**Request:**
```json
{
  "name": "Ravi Kumar",
  "mobile": "9876543210",
  "type": "INDIVIDUAL",
  "vehicleNo": "MH12 AB 1234",
  "photoUrl": "data:image/jpeg;base64,..."
}
```

**Types:** INDIVIDUAL, DELIVERY, SERVICE, DOMESTIC, CAB, OTHER

**Response 201:** visitor object (id, name, mobile, type, vehicleNo, photoUrl, isFrequent)

**Errors:**
```
400 missing_field        → name or type not provided
400 invalid_visitor_type → type not in allowed enum
```

---

### POST /api/societies/:id/visitors/:visitorId/entries
Log a visitor entry. Also updates visitor.photoUrl and visitor.vehicleNo if provided.

**Permission:** visitor.log

**Request:**
```json
{
  "unitId": "uuid",
  "purpose": "Fixing AC",
  "vehicleNo": "MH12 AB 1234",
  "photoUrl": "data:image/jpeg;base64,...",
  "preApprovalId": "uuid"
}
```
All fields optional. At least one of unitId or preApprovalId recommended.

**Branch A — with preApprovalId:**
Pre-approval must be unused and not expired.
Entry created with status ALLOWED immediately (pre-approved).
Consumed atomically — double-use prevented via transaction.
Emits VISITOR_PRE_APPROVAL_USED event.

**Branch B — walk-in without unitId:**
Entry created with status PENDING.
No flat to notify — notifiedAt stays null.

**Branch C — walk-in to a unit:**
Entry created with status PENDING.
All active occupants of the unit notified via push.
notifiedAt set only if at least one push notification sent.
Emits VISITOR_AT_GATE event.

**Response 201:** entry object (see entry shape below)

**Errors:**
```
400 missing_field               → visitorId not in params
400 invalid_unit                → unitId not found in this society
400 unit_required_for_preapproval → preApprovalId without unitId
400 invalid_or_used_preapproval → pre-approval not found, already used, or expired
404 visitor_not_found           → visitorId not in this society
```

**Entry object shape:**
```json
{
  "id": "uuid",
  "visitorId": "uuid",
  "visitorName": "Ravi Kumar",
  "visitorType": "INDIVIDUAL",
  "visitorPhoto": "data:image/jpeg;base64,...",
  "flatName": "Flat 4B",
  "purpose": "Fixing AC",
  "status": "PENDING",
  "loggedByName": "Ramesh Gate",
  "notifiedAt": "datetime",
  "respondedAt": null,
  "enteredAt": null,
  "exitedAt": null,
  "createdAt": "datetime"
}
```

---

### PATCH /api/societies/:id/entries/:entryId/approve
Resident approves visitor entry.

**Permission:** visitor.approve
**Requires:** token user must be an active occupant of the entry's unit

**Response 200:**
```json
{ "data": { "message": "visitor_approved", "status": "APPROVED" } }
```

**Errors:**
```
400 not_unit_occupant       → user not an active occupant of entry's flat
400 invalid_status_transition → entry not in PENDING status
404 entry_not_found
```

---

### PATCH /api/societies/:id/entries/:entryId/reject
Resident denies visitor entry.

**Permission:** visitor.approve

**Response 200:**
```json
{ "data": { "message": "visitor_denied", "status": "DENIED" } }
```

**Errors:**
```
400 invalid_status_transition → entry not in PENDING status
404 entry_not_found
```

---

### PATCH /api/societies/:id/entries/:entryId/allow
Gatekeeper manually allows entry (override or frequent visitor fast-track).

**Permission:** visitor.log

**Response 200:**
```json
{ "data": { "message": "visitor_allowed", "status": "ALLOWED" } }
```

**Errors:**
```
400 invalid_status_transition → entry already in terminal status
404 entry_not_found
```

---

### PATCH /api/societies/:id/entries/:entryId/turnaway
Gatekeeper turns visitor away.

**Permission:** visitor.log

**Response 200:**
```json
{ "data": { "message": "visitor_turned_away", "status": "TURNED_AWAY" } }
```

**Errors:**
```
400 invalid_status_transition → entry already in terminal status
404 entry_not_found
```

---

### PATCH /api/societies/:id/entries/:entryId/enter
Mark visitor as physically entered the premises.

**Permission:** visitor.log
**Requires:** entry must be in APPROVED or ALLOWED status

**Response 200:**
```json
{ "data": { "message": "visitor_entered", "enteredAt": "datetime" } }
```

**Errors:**
```
400 invalid_status_transition → entry not APPROVED or ALLOWED
400 visitor_already_entered   → enteredAt already set
404 entry_not_found
```

---

### PATCH /api/societies/:id/entries/:entryId/exit
Mark visitor as exited the premises.

**Permission:** visitor.log
**Requires:** entry must have enteredAt set

**Response 200:**
```json
{ "data": { "message": "visitor_exited", "exitedAt": "datetime" } }
```

**Errors:**
```
400 not_entered   → visitor has not been marked as entered
404 entry_not_found
```

---

### GET /api/societies/:id/entries/active
List all visitors currently inside (enteredAt set, exitedAt null).

**Permission:** visitor.view_live

**Response 200:**
```json
{ "data": { "entries": [ ...entry objects ] } }
```

**Note:** Must be registered before `GET /:id/entries/:entryId` routes in router
to avoid `:entryId` matching the literal string "active".

---

### GET /api/societies/:id/entries
Full entry log with filters.

**Permission:** visitor.view_log OR visitor.view_own

**Query params:**
```
status  → PENDING | APPROVED | DENIED | ALLOWED | TURNED_AWAY | EXITED
unitId  → filter by flat (uuid)
date    → YYYY-MM-DD format
type    → INDIVIDUAL | DELIVERY | SERVICE | DOMESTIC | CAB | OTHER
```

**Scoping behaviour:**
- visitor.view_log → sees all entries for the society (Admin, Builder, Gatekeeper)
- visitor.view_own → sees only entries for their own flats (Resident, Co-resident)
- If both permissions present: view_log wins

**Response 200:**
```json
{ "data": { "entries": [ ...entry objects ] } }
```

**Note:** Returns max 50 entries ordered by createdAt desc.

---

### POST /api/societies/:id/pre-approvals
Create a pre-approval for an expected visitor.

**Permission:** visitor.pre_approve
**Requires:** token user must be an active occupant of unitId

**Request:**
```json
{
  "visitorName": "Swiggy Delivery",
  "visitorMobile": "9123456789",
  "unitId": "uuid",
  "note": "Leave at door",
  "expiresAt": "2026-12-31T23:59:59.000Z"
}
```
expiresAt is optional. If provided, must be a future datetime.

**Response 201:**
```json
{
  "data": {
    "id": "uuid", "visitorName": "Swiggy Delivery",
    "visitorMobile": "+919123456789", "unitId": "uuid",
    "note": "Leave at door", "expiresAt": "datetime",
    "isUsed": false, "createdAt": "datetime"
  }
}
```

**Errors:**
```
400 missing_field             → visitorName or unitId not provided
400 not_unit_occupant         → user not an active occupant of unitId
400 invalid_unit              → unitId not found in this society
400 invalid_expires_at        → expiresAt is not a valid datetime
400 expires_at_must_be_future → expiresAt is in the past
```

---

### GET /api/societies/:id/pre-approvals
List all pre-approvals for the requesting user's flats.

**Permission:** visitor.pre_approve

**Response 200:**
```json
{
  "data": {
    "preApprovals": [
      {
        "id": "uuid", "visitorName": "Swiggy Delivery",
        "visitorMobile": "+919123456789", "unitId": "uuid",
        "flatName": "Flat 4B", "note": "Leave at door",
        "expiresAt": null, "isUsed": false,
        "usedAt": null, "createdAt": "datetime"
      }
    ]
  }
}
```

---

### DELETE /api/societies/:id/pre-approvals/:approvalId
Cancel an unused pre-approval.

**Permission:** visitor.pre_approve

**Response 200:**
```json
{ "data": { "message": "pre_approval_cancelled" } }
```

**Errors:**
```
400 pre_approval_already_used → pre-approval has already been consumed
404 pre_approval_not_found
```

---

### POST /api/societies/:id/visitors/:visitorId/frequent
Mark a visitor as frequent for a specific unit.

**Permission:** visitor.mark_frequent
**Requires:** token user must be an active occupant of unitId

**Request:**
```json
{ "unitId": "uuid" }
```

**Response 200:**
```json
{ "data": { "message": "marked_frequent" } }
```

**Errors:**
```
400 missing_field     → unitId not provided
400 not_unit_occupant → user not an active occupant of unitId
400 invalid_unit      → unitId not found in this society
404 visitor_not_found
```

---

### DELETE /api/societies/:id/visitors/:visitorId/frequent
Remove frequent visitor status.

**Permission:** visitor.mark_frequent

**Response 200:**
```json
{ "data": { "message": "frequent_removed" } }
```

**Errors:**
```
404 visitor_not_found   → visitor not in this society
404 not_frequent        → visitor not marked as frequent
```

---

### GET /api/societies/:id/visitors/frequent
List all frequent visitors for the requesting user's flats.

**Permission:** visitor.mark_frequent

**Response 200:**
```json
{
  "data": {
    "visitors": [
      {
        "id": "uuid", "name": "Ravi Kumar", "mobile": "+919876543210",
        "type": "INDIVIDUAL", "photoUrl": null,
        "isFrequent": true, "frequentForUnitId": "uuid", "frequentFlatName": "Flat 4B"
      }
    ]
  }
}
```

**Note:** Must be registered before `GET /:id/visitors/:visitorId` routes in router
to avoid `:visitorId` matching the literal string "frequent".
