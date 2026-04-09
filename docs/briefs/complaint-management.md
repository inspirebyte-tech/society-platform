# Feature Brief: Complaint Management

## Overview
First resident-facing feature in Vaastio. Residents raise
complaints within their society. Admins manage and resolve
them. Images supported via Cloudinary. Push notifications
keep both parties informed. Requires notification foundation
to be built first.

---

## Who Uses It
Resident — raise complaints, view own, resolve own
Co-resident — same as Resident
Admin — view all, resolve any, reject with reason
Builder — same as Admin for complaints
Gatekeeper — no access

---

## What It Does

### Raise A Complaint
Resident submits a complaint with:
  Title (short summary)
  Description (full detail)
  Category (from predefined list)
  Visibility (Public or Private — default Private)
  Images (optional, max 5)

Admin is notified immediately via push notification.

### View Complaints
Admin sees all complaints in the society.
Resident sees only their own complaints
plus public complaints from other residents.

For public complaints from others:
  Resident sees title, category, status, date
  Complainant identity hidden from other residents
  Admin always sees full details including who raised it

### Resolve A Complaint
Both resident (own) and admin (any) can mark resolved.
Realistic — most issues get fixed via phone call.
App just tracks that it happened.
Other party notified via push notification.

### Reject A Complaint
Admin only.
Must provide reason — predefined options plus optional text.
Resident notified via push notification.

### Filter And Browse
Admin can filter by status, category, visibility.
Resident can filter own complaints by status.
Pagination — 20 per page.

---

## What It Does NOT Do
- No comments or discussion thread on complaints
- No complaint assignment to specific staff (V2)
- No IN_PROGRESS status (V2 if users request)
- No reopen — new complaint raised if issue persists
- No bulk resolve actions (V2)
- No complaint analytics dashboard (V2)
- No push notifications to all residents for public complaints (V2)
- No video attachments (V2)

---

## Complaint Visibility

### Public
Common area or infrastructure issues.
Affects everyone in society.
All residents can see: title, category, status, date.
Complainant identity hidden from other residents.
Admin sees everything including who raised it.
Examples: broken lift, water supply failure,
parking lot lights not working.

### Private
Personal or neighbour-related issues.
Only complainant and admin can see it.
Never visible to other residents.
Examples: noise complaint, dog waste,
neighbour behaviour, domestic help dispute.

### Default: Private
A public-by-mistake is worse than private-by-mistake.
Resident explicitly chooses Public when raising.
Admin can change visibility after submission.

---

## Categories

Infrastructure:
  Water Supply, Electricity, Lift/Elevator,
  Generator, Internet/Cable

Common Areas:
  Parking, Garbage/Waste, Garden/Landscaping,
  Gym/Clubhouse, Swimming Pool, Security

Personal/Neighbour:
  Noise, Pet Related, Domestic Help,
  Neighbour Behaviour

Administrative:
  Staff Behaviour, Maintenance/Repair, Rule Violation

Other

---

## Status Flow

OPEN → RESOLVED
OPEN → REJECTED (admin only)

No reopen. No In Progress.
Resident raises new complaint if issue persists.
Keeps history clean. No complex state management.

---

## Rejection Reason

Predefined dropdown:
  "Duplicate complaint"
  "Outside society jurisdiction"
  "Invalid or incomplete information"
  "Other"

If Other selected → free text field required.
Other options → free text optional.
Both stored as single string in rejectionReason field.

---

## Images

Optional. Up to 5 per complaint. Max 5MB each.
Attached during complaint creation only.
Cannot add images after submission.

Storage: Cloudinary (free tier — 25GB, more than enough for V1).

Upload flow:
  Resident picks images from phone gallery
  Images uploaded to Cloudinary on submit
  Cloudinary returns secure URLs
  Complaint created with those URLs stored

---

## Notifications

Requires notification foundation built first.

New complaint raised → Admin and Builder notified
Complaint resolved by admin → Complainant notified
Complaint rejected → Complainant notified
Complaint resolved by resident → Admin notified

Public complaints: Admin notified only (V1).
Other residents see it when opening app — no push to all.

---

## User Flows

### Flow 1 — Resident Raises A Complaint

Resident opens Complaints section
→ Taps raise complaint button
→ Fills in title and description
→ Selects category from list
→ Chooses visibility (default Private)
→ Optionally adds images (up to 5)
→ Taps Submit
→ Success confirmation shown
→ Returns to complaints list
→ Admin receives push notification

### Flow 2 — Admin Views And Resolves

Admin sees notification: "New Complaint: Lift/Elevator — Lift not working"
→ Opens app → goes to complaints
→ Sees complaint in list
→ Taps to see full detail
→ Calls resident or handles offline
→ Taps Resolve
→ Complaint marked resolved
→ Resident receives push notification

### Flow 3 — Admin Rejects A Complaint

Admin opens complaint detail
→ Taps Reject
→ Sees rejection reason picker
→ Selects "Duplicate complaint"
→ Optionally adds note
→ Confirms
→ Complaint marked rejected
→ Resident notified

### Flow 4 — Resident Views Public Complaint From Others

Resident opens complaints list
→ Sees public complaints section
→ Sees: "Lift/Elevator — Lift not working — OPEN"
→ Does NOT see who raised it
→ Taps to see detail
→ Sees full description but no complainant name
→ Cannot take any action on it

### Flow 5 — Resident Resolves Own Complaint

Resident opens own complaint
→ Issue got fixed via phone call from admin
→ Taps Mark Resolved
→ Confirmation dialog
→ Confirms
→ Complaint closed
→ Admin notified

---

## Edge Cases

Resident tries to view private complaint from others:
  Returns 403 — not found or no access
  Never confirm complaint exists to non-participants

Admin changes visibility from Private to Public:
  Allowed — admin has full control
  But complainant identity still hidden from others
  Admin still sees full details

Complaint raised with no images:
  Perfectly valid — images always optional

Multiple images fail to upload:
  Show error per image
  Allow resubmission
  Don't lose filled form data

Resident tries to reject own complaint:
  403 — insufficient permissions
  Only admin can reject

Complaint already resolved, admin tries to resolve again:
  400 — already_resolved

Society has no admin (edge case):
  Builder receives all notifications
  Builder can resolve and reject
  Builder is always the fallback

---

## Database Changes

New tables:
  complaints — main complaint record
  complaint_images — image URLs per complaint

New enums:
  ComplaintCategory — all category values
  ComplaintVisibility — PUBLIC, PRIVATE
  ComplaintStatus — OPEN, RESOLVED, REJECTED

New indexes:
  orgId — for fetching society complaints
  raisedBy — for fetching own complaints
  orgId + status — for filtered list
  orgId + visibility — for public filter
  orgId + category — for category filter

---

## Permissions To Add In Seed

New permissions:
  complaint.create
  complaint.view_own
  complaint.view_all
  complaint.resolve_own
  complaint.resolve_any
  complaint.reject

Role bundles:
  Resident + Co-resident → create, view_own, resolve_own
  Admin + Builder → view_all, resolve_any, reject

---

## API Endpoints Needed

POST   /societies/:id/complaints
GET    /societies/:id/complaints
GET    /societies/:id/complaints/:complaintId
PATCH  /societies/:id/complaints/:complaintId

Full contracts in API.md after implementation.

---

## Files To Create

apps/api/src/routes/complaints.ts
prisma/migrations/XXXXX_add_complaints/
docs/briefs/complaint-management.md

## Files To Update

apps/api/src/app.ts          → register complaints router
prisma/schema.prisma         → new models and enums
prisma/seed.ts               → new permissions + role bundles
docs/API.md                  → complaint endpoints
docs/MOBILE_CONTEXT.md       → complaint screens + endpoints

---

## V2 Plans
Complaint assignment to specific staff member
IN_PROGRESS status with expected resolution date
SLA tracking — avg resolution time per category
Analytics dashboard for admin
Bulk resolve for recurring issues
Public complaint push notifications (opt-in for residents)
Video attachment support
Image viewer with full screen zoom

---

## Definition of Done
□ Complaint schema migrated
□ POST /complaints — resident can raise with images
□ GET /complaints — admin sees all, resident sees own + public
□ GET /complaints/:id — visibility rules enforced
□ PATCH /complaints/:id — resolve and reject work correctly
□ Admin cannot raise complaints — blocked
□ Resident cannot reject — blocked
□ Resident cannot resolve others' complaints — blocked
□ Private complaint not visible to other residents — enforced
□ Public complaint hides complainant from other residents
□ Images uploaded to Cloudinary correctly
□ Push notifications triggered on all events
□ All permissions added to seed
□ All error cases handled
□ API.md updated
□ DECISIONS.md updated
□ MOBILE_CONTEXT.md updated
□ PR merged to dev

---

## Out of Scope
- Comments or discussion threads
- Complaint assignment to staff
- IN_PROGRESS status
- Complaint analytics
- Reopen flow
- Bulk operations
- Video attachments
- Notification preferences

---

## V2 Plans
Complaint assignment to specific staff member
IN_PROGRESS status with expected resolution date
SLA tracking — avg resolution time per category
Analytics dashboard for admin
Bulk resolve for recurring issues
Public complaint push notifications (opt-in for residents)
Video attachment support
Image viewer with full screen zoom

---

## Definition of Done
□ Complaint schema migrated
□ POST /complaints — resident can raise with images
□ GET /complaints — admin sees all, resident sees own + public
□ GET /complaints/:id — visibility rules enforced
□ PATCH /complaints/:id — resolve and reject work correctly
□ Admin cannot raise complaints — blocked
□ Resident cannot reject — blocked
□ Resident cannot resolve others' complaints — blocked
□ Private complaint not visible to other residents — enforced
□ Public complaint hides complainant from other residents
□ Images uploaded to Cloudinary correctly
□ Push notifications triggered on all events
□ All permissions added to seed
□ All error cases handled
□ API.md updated
□ DECISIONS.md updated
□ MOBILE_CONTEXT.md updated
□ PR merged to dev

---

## Out of Scope
- Comments or discussion threads
- Complaint assignment to staff
- IN_PROGRESS status
- Complaint analytics
- Reopen flow
- Bulk operations
- Video attachments
- Notification preferences