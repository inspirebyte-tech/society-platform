# Mobile App — Complete Context Document

## What We Are Building

Society Platform — a mobile app for Indian residential societies.
Builder-first. Operational in 30 minutes. No ads. No complexity.

This document gives complete context for building the mobile app
(apps/mobile/) without needing to read the entire codebase.

---

## Tech Stack

Backend (already built):
  Node.js + Express + TypeScript
  PostgreSQL + Prisma 5.22
  JWT authentication
  Running on: http://localhost:3000 (dev)

Mobile (to build):
  React Native + Expo (managed workflow)
  TypeScript
  React Navigation v6
  Axios for API calls
  Location: apps/mobile/

## Expo Setup Commands
```bash
cd apps/mobile
npx create-expo-app . --template blank-typescript
npm install @react-navigation/native
npm install @react-navigation/native-stack
npm install react-native-screens react-native-safe-area-context
npm install axios
npm install expo-secure-store
npx expo start
```

---

## Project Structure

society-platform/
apps/
api/          ← backend (complete)
mobile/       ← mobile app (to build)
docs/
API.md        ← all endpoint contracts
ARCHITECTURE.md
briefs/       ← feature briefs

---

## Authentication Flow

### How Auth Works

1. User enters phone number
2. OTP sent via SMS
3. User enters OTP
4. Backend returns JWT token
5. Token stored in app
6. Token sent in every request header

### Token Types

Auth token:
Has: userId only (no orgId)
Used for: selecting which society to enter
When: user has multiple societies
Session token:
Has: userId + orgId
Used for: all feature endpoints
When: user is inside a specific society

### Login Flow In App

Screen: Enter phone
→ POST /auth/request-otp
→ Show OTP input screen

Screen: Enter OTP
→ POST /auth/verify-otp
→ Response has 3 cases:

Case 1: isNewUser = true, memberships = []
→ No society yet
→ Go to Create Society screen

Case 2: memberships.length === 1
→ Auto selected
→ token has orgId already
→ Go to Society Dashboard

Case 3: requiresOrgSelection = true
→ Multiple societies
→ Show society selector
→ POST /auth/select-org to get session token
→ Go to Society Dashboard

### Storing Tokens

Use expo-secure-store (NOT AsyncStorage)
Keys:
'session_token'   → current JWT
'refresh_token'   → for token refresh

---

## API Configuration

### Base URL

Development: http://localhost:3000/api
Production:  (not yet set up)

### Every Request Needs

Headers:
Authorization: Bearer YOUR_SESSION_TOKEN
Content-Type: application/json

### Standard Response Format
```json
Success:
{ "data": { ... } }

Error:
{ "error": "snake_case_error_code", "details": { ... } }
```

### Standard Error Codes

401 no_token              → not logged in → go to login
401 invalid_token         → token expired → refresh or login
401 token_revoked         → logged out → go to login
403 insufficient_permissions → show error message
403 tenant_context_mismatch → wrong society context
404 not_found             → show not found state
400 missing_field         → show validation error
400 invalid_*             → show validation error
500 server error          → show generic error

---

## All Endpoints — Quick Reference

### Auth Endpoints (no token needed)

POST /auth/request-otp    → send OTP to phone
POST /auth/verify-otp     → verify OTP, get token
POST /auth/refresh        → refresh expired token
POST /auth/select-org     → select society, get session token
GET  /auth/me             → current user + permissions
POST /auth/logout         → logout

### Society Endpoints

POST   /societies         → create society (Builder)
GET    /societies         → list user's societies
GET    /societies/:id     → society details
PATCH  /societies/:id     → update society (Builder/Admin)

### Node Endpoints (structure management)

GET    /societies/:id/nodes             → full tree
POST   /societies/:id/nodes             → add single node
POST   /societies/:id/nodes/bulk        → bulk add units
PATCH  /societies/:id/nodes/:nodeId     → edit node
DELETE /societies/:id/nodes/:nodeId     → delete node

### Invitation Endpoints

POST   /societies/:id/invitations              → invite member
GET    /societies/:id/invitations              → list pending
DELETE /societies/:id/invitations/:invId       → cancel invite

### Member Endpoints

GET    /societies/:id/members                        → list members
GET    /societies/:id/members/:memberId              → member details
PATCH  /societies/:id/members/:memberId/deactivate   → remove access
PATCH  /societies/:id/members/:memberId/moveout      → mark moved out
PATCH  /societies/:id/members/:memberId/reactivate   → restore access

---

## Screens To Build — Priority Order

### Phase 1 — Society Setup (build first)

**Screen 1: Login — Enter Phone**

Route: /login
Connects to: POST /auth/request-otp
Fields: phone number input
Action: Send OTP button
Next: OTP screen

**Screen 2: Login — Enter OTP**

Route: /verify-otp
Connects to: POST /auth/verify-otp
Fields: 6 digit OTP input
Action: Verify button
Next: depends on response (see auth flow above)

**Screen 3: Society Selector**

Route: /select-society
Connects to: GET /societies
POST /auth/select-org
Shows: list of user's societies with role
Action: tap to select → get session token → dashboard

**Screen 4: Create Society**

Route: /create-society
Connects to: POST /societies
Fields: name, address, city, state, pincode, type (dropdown)
Type options: Apartment, Villa, Mixed, Plotted
Action: Submit button
Next: Society Dashboard
Wireframe: approved ✓

**Screen 5: Society Dashboard**

Route: /dashboard
Connects to: GET /societies/:id
Shows: society name, type, total units, total members
Actions:
Manage Structure → nodes screen
Invite Member → invite screen
View Members → members screen
Wireframe: approved ✓

**Screen 6: Structure Management**

Route: /structure
Connects to: GET /societies/:id/nodes
Shows: nested tree of towers, wings, units
Actions:
Edit node → edit form
Delete node → confirm → DELETE
Add Unit → add node form
Add Tower/Wing → add node form
Wireframe: approved ✓

**Screen 7: Add Node**

Route: /add-node
Connects to: POST /societies/:id/nodes
POST /societies/:id/nodes/bulk
Toggle: Single / Bulk
Single fields: nodeType, name, code, bhk, floor, area
Bulk fields: parentId, nodeType, count, startNumber, prefix
Wireframe: approved ✓

**Screen 8: Invite Member**

Route: /invite
Connects to: POST /societies/:id/invitations
GET  /societies/:id/invitations
DELETE /societies/:id/invitations/:id
Fields: phone number, role dropdown
Role options: Admin, Resident, Gatekeeper, Co-resident
Shows pending invitations list below form
Wireframe: approved ✓

### Phase 2 — Member Management

Screen: Member List
Connects to: GET /societies/:id/members
Shows: active members + pending setup
Filter by role
Screen: Member Detail
Connects to: GET /societies/:id/members/:memberId
Shows: full member info + history
Actions: deactivate, moveout, reactivate

### Phase 3 — Features (not built on backend yet)

Complaints
Announcements
Visitor Management
Emergency Alerts

---

## Navigation Structure

Stack Navigator (root):
Login screens (no auth needed):
LoginPhone
LoginOTP
SelectSociety
App screens (auth needed):
CreateSociety
Dashboard
Structure
AddNode
InviteMember
MemberList
MemberDetail

---

## Roles And What They See

Builder:
Can see: everything
Dashboard actions: Manage Structure, Invite Member, View Members
Extra: Create Society

Admin:
Dashboard actions: Manage Structure, Invite Member, View Members
Cannot: Create Society, Reactivate members

Resident:
Dashboard: limited view
Cannot: see member list, manage structure, invite

Gatekeeper:
Only gate-related features (future)
Cannot: access society management screens

---

## How To Know What User Can See

After login, GET /auth/me returns permissions array.
Use this to show/hide UI elements.

Example:
if permissions.includes('member.view') → show View Members button
if permissions.includes('node.create') → show Add button in structure
if permissions.includes('invitation.create') → show Invite button

---

## API Service Setup
```typescript
// src/services/api.ts
import axios from 'axios'
import * as SecureStore from 'expo-secure-store'
import { API_BASE_URL } from '../constants/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' }
})

// attach token to every request
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('session_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default api
```

## Error Handling Pattern
```typescript
try {
  const response = await api.post('/societies', data)
  // handle success
} catch (error) {
  if (error.response?.status === 401) {
    // token expired → go to login
    navigation.navigate('Login')
  } else if (error.response?.status === 400) {
    // validation error → show field error
    const errorCode = error.response.data.error
    const field = error.response.data.details?.field
    setFieldError(field, getErrorMessage(errorCode))
  } else {
    // generic error
    showToast('Something went wrong. Please try again.')
  }
}
```

---

## Folder Structure To Create

apps/mobile/
src/
screens/
auth/
LoginPhoneScreen.tsx
LoginOTPScreen.tsx
SelectSocietyScreen.tsx
society/
CreateSocietyScreen.tsx
DashboardScreen.tsx
StructureScreen.tsx
AddNodeScreen.tsx
InviteMemberScreen.tsx
members/
MemberListScreen.tsx
MemberDetailScreen.tsx
components/
Button.tsx
Input.tsx
ErrorText.tsx
LoadingSpinner.tsx
services/
api.ts          ← axios instance with base URL and auth header
auth.ts         ← login, logout, token management
societies.ts    ← society API calls
nodes.ts        ← node API calls
invitations.ts  ← invitation API calls
members.ts      ← member API calls
navigation/
RootNavigator.tsx
AuthNavigator.tsx
AppNavigator.tsx
hooks/
useAuth.ts      ← current user, token, permissions
useSociety.ts   ← current society context
utils/
errorMessages.ts → map error codes to user friendly messages
validators.ts    → phone validation etc
constants/
api.ts          ← API_BASE_URL

---

## Test Users (local development)

GET http://localhost:3000/api/test-tokens
Builder:     +919111111111 (Vikram Builder)
Resident:    +919222222222 (Arjun Mehta)
Gatekeeper:  +919333333333 (Ramesh Gate)
Co-resident: +919444444444 (Meera Mehta)

---

## What's Done, What's Not

Done (backend):
✓ Auth — OTP, JWT, token management
✓ Society CRUD
✓ Structure management (nodes)
✓ Invitations
✓ Member management
✓ 104 automated tests
✓ CI on GitHub Actions
Not done yet (backend):
Complaints
Announcements
Visitor Management
Emergency Alerts
Polls
Asset Booking

Not done yet (mobile):
Everything — starting now

---

## Key Decisions Already Made

Phone-only login — no email
OTP 6 digits, expires 10 minutes
JWT expires 7 days, refresh token 30 days
Soft deletes only — nothing ever hard deleted
orgId always from token — never from URL or body
Permissions loaded fresh from DB on every request
Indian phone numbers only — must start with 6-9
orgId context:
  After login user gets token with orgId embedded
  Every API call uses this token
  Frontend never sends orgId in request body
  orgId lives in the token only
  If user has multiple societies → must call
  POST /auth/select-org to get correct token
  before accessing any society-specific screen