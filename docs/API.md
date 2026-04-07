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