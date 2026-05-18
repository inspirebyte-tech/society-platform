# Visitor & Gate Management — Feature Brief

## Overview
Digital gate register for Indian residential societies.
Gatekeeper logs every visitor entry and exit.
Residents approve or deny visitors from the app.
Full audit trail of everyone who enters the society.

---

## Visitor Types
INDIVIDUAL   — friend, family, guest
DELIVERY     — Amazon, Swiggy, courier, parcels
SERVICE      — plumber, electrician, AC repair, painter
DOMESTIC     — maid, cook, driver (often frequent)
CAB          — Ola, Uber, pickup/drop
OTHER        — anything else

---

## Entry Status Flow
PENDING      → gatekeeper logged, resident notified, waiting
APPROVED     → resident approved via app
DENIED       → resident denied via app
ALLOWED      → gatekeeper allowed (override, frequent visitor, pre-approved)
TURNED_AWAY  → gatekeeper turned visitor away
EXITED       → visitor has left society

---

## Core Flows

### Flow 1 — Walk-in Visitor (most common)
1. Visitor arrives at gate
2. Gatekeeper opens app → Log Visitor
3. Search by name or mobile → found or create new
4. Select which flat they're visiting
5. Enter purpose (optional), vehicle number (optional)
6. Take photo (optional)
7. Submit → status: PENDING
8. All occupants of that flat get push notification
9. Resident taps notification → sees visitor details → Approve or Deny
10. Gatekeeper sees decision in real time
11. If no response → gatekeeper waits, can call resident on phone
12. Gatekeeper manually marks ALLOWED or TURNED_AWAY
13. On entry → gatekeeper marks ENTERED (sets enteredAt)
14. On exit → gatekeeper marks EXITED (sets exitedAt)

### Flow 2 — Pre-approved Visitor
1. Resident pre-approves expected visitor in advance
   "My brother Rahul coming today, mobile 98765xxxxx"
2. Visitor arrives → gatekeeper searches by name/mobile
3. System shows PRE-APPROVED badge with resident name
4. Gatekeeper confirms and logs entry directly
5. Status: ALLOWED immediately
6. Resident gets notification: "Your pre-approved visitor has entered"
7. Pre-approval marked as used (single-use)

### Flow 3 — Frequent Visitor
1. Resident marks someone as frequent visitor for their flat
   "Sunita (maid) — daily visitor"
2. Visitor arrives → gatekeeper searches → sees FREQUENT badge
3. Gatekeeper can:
   A) Allow directly — status: ALLOWED, no notification to resident
   B) Still notify resident — same as walk-in flow
   Gatekeeper's choice
4. Exit logged same as any visitor

### Flow 4 — Delivery (no specific flat)
1. Courier arrives for Flat 4B
2. Gatekeeper logs as DELIVERY type
3. Selects flat → notifies resident
4. Resident approves package pickup
5. Or gatekeeper logs directly if resident known to expect it

---

## Who Can Do What

### Gatekeeper
- Log new visitor entry
- Search existing visitors
- Take visitor photo
- Select flat being visited
- Approve/Allow entry (manual override)
- Deny/Turn away visitor
- Mark visitor as entered
- Mark visitor as exited
- View active visitors (currently inside)
- View full entry log

### Resident / Co-resident
- Approve visitor from notification
- Deny visitor from notification
- Pre-approve expected visitors
- Mark frequent visitors for their flat
- Remove frequent visitor status
- View visitor history for their flat

### Admin / Builder
- View full society entry log
- View active visitors
- View all pre-approvals
- Cannot approve/deny (not their flat)

---

## Permissions
visitor.log           → Gatekeeper
visitor.view_live     → Gatekeeper, Admin, Builder
visitor.approve       → Resident, Co-resident
visitor.pre_approve   → Resident, Co-resident
visitor.mark_frequent → Resident, Co-resident
visitor.view_log      → Admin, Builder, Gatekeeper

---

## Schema — 3 new tables

### visitors
Stores unique visitor records.
Same person visiting multiple times = one visitor record, many entries.

id, orgId, name, mobile (optional), vehicleNo (optional),
type (VisitorType), photoUrl (optional),
isFrequent (boolean), frequentForUnitId (optional),
frequentApprovedBy (userId, optional),
createdAt, updatedAt

### visitor_entries
One record per visit event.

id, orgId, visitorId, unitId (optional), flatName (denormalized),
purpose (optional), status (EntryStatus),
loggedBy (gatekeeper userId),
approvedBy (resident userId, optional),
notifiedAt, respondedAt,
enteredAt, exitedAt,
note (optional),
createdAt, updatedAt

### visitor_pre_approvals
Resident-created advance approvals. Single-use.

id, orgId, visitorName, visitorMobile (optional),
unitId, approvedBy (resident userId),
note (optional),
isUsed (boolean), usedAt (optional),
expiresAt (optional — resident can set if needed),
createdAt, updatedAt

---

## Endpoints — 13 total

### Gatekeeper
POST   /societies/:id/visitors
  Search or create visitor by name/mobile
  Returns: visitor with isFrequent flag and pre-approval match

POST   /societies/:id/visitors/:visitorId/entries
  Log entry — select flat, purpose, vehicle, photo
  Sends push notification to flat occupants
  Returns: entry with status PENDING

PATCH  /societies/:id/entries/:entryId/allow
  Gatekeeper manually allows entry
  Status: PENDING/APPROVED → ALLOWED

PATCH  /societies/:id/entries/:entryId/turnaway
  Gatekeeper turns visitor away
  Status: PENDING/DENIED → TURNED_AWAY

PATCH  /societies/:id/entries/:entryId/enter
  Mark visitor as physically entered
  Sets enteredAt

PATCH  /societies/:id/entries/:entryId/exit
  Mark visitor as exited
  Sets exitedAt, status → EXITED

GET    /societies/:id/entries/active
  All visitors currently inside (enteredAt set, exitedAt null)

GET    /societies/:id/entries
  Full entry log with filters: date, flat, status, type

### Resident
PATCH  /societies/:id/entries/:entryId/approve
  Resident approves visitor
  Status: PENDING → APPROVED
  Notifies gatekeeper

PATCH  /societies/:id/entries/:entryId/reject
  Resident rejects visitor
  Status: PENDING → DENIED
  Notifies gatekeeper

POST   /societies/:id/pre-approvals
  Create pre-approval for expected visitor
  Body: visitorName, visitorMobile, note, expiresAt

GET    /societies/:id/pre-approvals
  My pre-approvals (for my flats only)

DELETE /societies/:id/pre-approvals/:approvalId
  Cancel pre-approval

POST   /societies/:id/visitors/:visitorId/frequent
  Mark visitor as frequent for my flat

DELETE /societies/:id/visitors/:visitorId/frequent
  Remove frequent status

GET    /societies/:id/entries?myFlat=true
  Entry history for my flat only (resident view)

---

## Notifications

VISITOR_AT_GATE
  → all occupants of the flat being visited
  → "Ramesh Kumar is at the gate for you"
  → high priority
  → data: { screen: 'VisitorApproval', entryId, orgId }

VISITOR_APPROVED
  → gatekeeper who logged the entry
  → "Arjun Mehta approved Ramesh Kumar"
  → data: { screen: 'ActiveVisitors', orgId }

VISITOR_DENIED
  → gatekeeper who logged the entry
  → "Arjun Mehta denied Ramesh Kumar"
  → data: { screen: 'ActiveVisitors', orgId }

VISITOR_PRE_APPROVAL_USED
  → resident who created the pre-approval
  → "Your pre-approved visitor Rahul has entered"
  → data: { screen: 'VisitorHistory', orgId }

---

## Mobile Screens — 6 screens

### LogVisitorScreen (Gatekeeper)
Main screen for logging a new visitor.
Search by name or mobile first.
If found: show visitor card with FREQUENT or PRE-APPROVED badge.
If not found: form to create new visitor.
Fields: name (required), mobile (optional), type (required),
        which flat (required — searchable picker),
        purpose (optional), vehicle number (optional),
        photo (optional — camera)
Submit → entry created, notification sent.

### ActiveVisitorsScreen (Gatekeeper)
All visitors currently inside (entered, not exited).
Each row: visitor name, flat, time entered, type badge.
Tap → mark exit.
Pull to refresh.

### EntryLogScreen (Gatekeeper + Admin + Builder)
Full history with filters.
Filter by: date range, flat, status, visitor type.
Each row: name, flat, status badge, time.
Tap → entry detail.

### VisitorApprovalScreen (Resident)
Opens from push notification tap.
Shows: visitor photo (if taken), name, type, purpose, flat.
Shows: how long waiting (time since notified).
Two buttons: Approve (green) / Deny (red).
Loading state while submitting.
After action: success message, close screen.

### MyVisitorsScreen (Resident)
Two sections:
  Pre-approvals: list with name, note, expiry, used/unused badge.
    + Add new pre-approval button.
    Tap to cancel.
  Frequent visitors: list with name, mobile, flat.
    Tap to remove.
  Recent visitor history for my flat.

### VisitorHistoryScreen (Resident — from My Home or dashboard)
Entry log filtered to my flat only.
Shows all past visitors with status, date, approved by.

---

## Dashboard Updates

Gatekeeper dashboard:
  Add prominent "Log Visitor" button at top
  Add "Active Visitors" count badge
  Add "Entry Log" quick action

Resident dashboard:
  Add "My Visitors" quick action
  (pre-approvals + frequent visitors)

---