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
        "permissions": ["org.create", "unit.create", "..."]
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