# Decision Log

This file records every non-obvious architectural decision,
why it was made, and what alternatives were considered.
New decisions get added here as they are made.

---

## 001 — User and Person as separate tables
Date: [2026-03-13]
Decision: Store authentication (User) and real-world humans (Person) separately
Reason: Not every person in the system has an app account.
        Family members, domestic workers, elderly residents
        all need to be recorded without having logins.
Alternatives considered: Single users table with nullable fields
Why rejected: Leads to nullable column sprawl and unclear data model

---

## 002 — Self-referential property_nodes
Date: [2026-03-13]
Decision: One table for all property hierarchy levels
Reason: Different societies have different layouts.
        Fixed tables (towers/floors/units) break with every new layout.
        Self-referential tree handles any depth, any structure.
Alternatives considered: Separate towers, floors, units tables
Why rejected: Schema changes needed for every new building layout

---

## 003 — Time-ranged ownership and occupancy
Date: [2026-03-13]
Decision: Store ownership/occupancy as date-ranged records, not current state
Reason: History is required for legal disputes, audits, maintenance records.
        Overwriting current state destroys this history permanently.
Alternatives considered: current_owner_id column on units table
Why rejected: No historical data, can't answer past-state queries

---

## 004 — Permissions as database rows
Date: [2026-03-13]
Decision: Store permissions as strings in DB, roles as permission bundles
Reason: Custom roles per society are inevitable.
        Hardcoded role checks become unmaintainable after 5+ roles.
Alternatives considered: if/else role checks in code
Why rejected: Every new role requires code deployment, risk of missed checks

---

## 005 — Prisma 5 over Prisma 7
Date: [2026-03-13]
Decision: Use Prisma 5.22 not latest Prisma 7
Reason: Prisma 7 changed config approach, broke standard patterns,
        has less community support and fewer solved problems online.
Alternatives considered: Prisma 7, raw SQL, Drizzle ORM
Why rejected: Prisma 7 too new, raw SQL too verbose for this team size,
              Drizzle less mature ecosystem

---

## 006 — JsonB for PropertyNode metadata
Date: [2026-03-13]
Decision: Use @db.JsonB instead of plain Json for metadata column
Reason: JsonB in PostgreSQL is binary-stored, indexed, and faster to query.
        Enables future GIN indexes for metadata attribute queries.
Alternatives considered: Plain Json, separate columns per attribute
Why rejected: Plain Json slower for queries, separate columns inflexible

---

## 007 — AuditLog table added at foundation
Date: [2026-03-13]
Decision: Add audit_logs table during initial schema setup
Reason: Societies require accountability records for disputes.
        Retrofitting audit logging after features are built is painful.
        Table costs nothing to have, implementation added per feature.
Alternatives considered: Add later, use PostgreSQL triggers
Why rejected: Later addition requires touching all existing features,
              triggers harder to maintain than app-level logging

## 008 — Co-resident role added at foundation
Date: 2026-03-13
Decision: Add Co-resident system role and co_resident.invite permission
          to core seed data before feature development begins
Reason: Owner and tenant delegation of flat-scoped access is a
        guaranteed future requirement. Adding the role and permission
        to the foundation costs nothing and avoids a painful retrofit
        later. The route and UI are not built yet — just the data model
        is ready.
Alternatives considered: Add later when feature is built
Why rejected: Schema is already open for it. Seed change is trivial.
              Doing it now means the permission exists in all future
              test data automatically.
The rule: You can only assign a role with permissions equal to
          or less than your own. Co-resident cannot invite further.

## 009 — Permission strings renamed for clarity
Date: 2026-03-24
Decision: Renamed permission strings from technical names
          to descriptive domain names before first feature build
          org.create → society.create
          unit.create/update/view → node.create/update/view
          member.invite → invitation.create
          Added new permissions: society.update, node.delete,
          invitation.cancel, invitation.view,
          ownership.remove, ownership.view,
          occupancy.view, role.view
Reason: Pre-production is the only safe time to rename.
        After launch, changing permission strings in production
        requires data migrations on live user data.
        Clean naming now prevents confusion forever.
        node.* is more accurate than unit.* because
        the system handles towers, wings, floors, not just units.
Alternatives considered: Keep old names, add new ones alongside
Why rejected: Two sets of permission strings for same concepts
              creates confusion for every future developer.

## 010 — OrgType enum added to Organization
Date: 2026-03-24
Decision: Added type field to Organization model
          Values: APARTMENT, VILLA, MIXED, PLOTTED
Reason: Different society types affect UI and future features.
        A plotted development has no towers.
        A villa community has no floors.
        Knowing the type lets the app show relevant options.

## 011 — NodeType enum extended
Date: 2026-03-24
Decision: Added PHASE, BUILDING, VILLA, PLOT, BASEMENT
          to NodeType enum
Reason: Indian society layouts vary significantly.
        Township projects have phases.
        Plotted developments have plots not units.
        Adding now costs one migration line.
        Adding after launch costs a production migration.

## 012 — Member visibility restricted to admin only
Date: 2026-04-03
Decision: Residents cannot see other members details.
          Only Admin and Builder can view full member list.
Reason: DPDP Act 2023 compliance. Phone numbers and
        personal details cannot be shared without consent.
        Opt-in community directory planned for V2.
Alternatives considered: Show limited directory to residents
Why rejected: Even name + flat number without consent
              is a grey area legally. V1 stays conservative.

## 013 — Member removal is always soft
Date: 2026-04-03
Decision: Removing a member deactivates membership,
          never deletes it. Occupancy end dated separately.
          Two removal types in V1:
            1. Deactivate only (membership.isActive = false)
            2. Mark moved out (+ occupiedUntil = today)
Reason: Historical records needed for disputes, insurance,
        legal cases. Reactivation possible if mistake made.
Alternatives considered: Hard delete
Why rejected: Destroys history permanently.
              Cannot answer "who lived here in Jan 2023?"

## 014 — Only Builder can reactivate members
Date: 2026-04-03
Decision: Admin can deactivate but not reactivate.
          Only Builder can reactivate any member.
Reason: Prevents rogue admin locking out legitimate
        members permanently. Builder always has
        override capability.
Note: When RWA takes over from builder, RWA President
      role gets this capability via permission assignment.
      Zero code change needed.

## 015 — Test environment bypasses rate limiting
Date: 2026-04-06
Decision: OTP and API rate limiters are bypassed
          in NODE_ENV=test environment
Reason: Rate limiting is infrastructure not business logic.
        Tests must not be blocked by request counts.
        Standard practice across all professional test suites.

## 016 — Automated test suite added
Date: 2026-04-06
Decision: Jest + Supertest for integration tests.
          Tests run sequentially (runInBand).
          Single DB reset via globalSetup before all suites.
          Separate test DB: society_platform_test
Reason: Manual testing doesn't scale beyond 3 developers.
        Automated tests catch regressions in seconds.
        Required for CI/CD pipeline.

## 017 — SMS sending bypassed in test environment  
Date: 2026-04-06
Decision: sendOtp returns success without sending
          in development and test environments
Reason: Tests must not depend on external services.
        Real SMS would cost money and be unreliable in CI.

## 018 — Notification foundation built before feature work
Date: 2026-04-09
Decision: Push notification infrastructure built as a
standalone sprint before complaint management.
Reason: Gate entry notifications are core product value.
Retrofitting into already-built features costs 3-4x more.
Build pipe once, plug in per feature.

## 019 — Public complaints anonymous to other residents
Date: 2026-04-09
Decision: Public complaints show title, category, status
to all residents but hide complainant identity.
Admin always sees full details.
Reason: Transparency about society issues builds trust.
Exposing who complained about whom creates conflict.
Anonymous public complaints give information without
enabling targeted harassment.

## 020 — No reopen — new complaint instead
Date: 2026-04-09
Decision: Resolved complaints cannot be reopened.
Resident raises new complaint if issue persists.
Reason: Clean history. Each complaint is a discrete event.
No complex state management needed.

## 021 — Images on creation only
Date: 2026-04-09
Decision: Images attached only when raising complaint.
Cannot add after submission.
Reason: Evidence should be captured at time of complaint.
Post-submission images create ambiguity about timing.
Simplifies backend and mobile logic significantly.

## 022 — Cloudinary for image storage
Date: 2026-04-09
Decision: Cloudinary free tier for complaint images.
Reason: 25GB free storage sufficient for V1.
Simple SDK. Mobile upload directly to Cloudinary.
URLs stored in DB — no binary data in PostgreSQL.

## 023 — Push notifications not testable in Expo Go
Date: 2026-04-10
Decision: Skip push notification testing in Expo Go.
Use __DEV__ guard to prevent errors in development.
Notifications work correctly in production builds.
Reason: Expo SDK 53 removed push notification support
from Expo Go. Development build required for full testing.
Will test when EAS build is set up.

## 024 — ownedUntil added now for V2 readiness
**Date:** 2026-04-13
**Decision:** Add ownedUntil to unit_ownerships now even though
ownership transfer UI is V2.
**Reason:** Adding field later requires migration. Adding now
costs nothing. Enables full ownership history from day one.

## 025 — Ownership and occupancy are separate records
**Date:** 2026-04-13
**Decision:** Owner and occupant tracked independently.
One person can own a flat but not live there.
**Reason:** Reflects real Indian society reality — builder-owned
rentals, tenant arrangements, and investment properties are common.

## 026 — Deactivate does not end occupancy
**Date:** 2026-04-13
**Decision:** Deactivating a member removes app access only.
Occupancy record untouched. Only explicit moveout ends occupancy.
**Reason:** Deactivation is an app concern. Physical occupancy
is a real world fact. These are independent concepts.

## 027 — Multiple owners and occupants per flat
**Date:** 2026-04-13
**Decision:** No hard limit on ownership or occupancy records
per flat. One marked isPrimary for display purposes.
**Reason:** Joint ownership and family arrangements are standard
in Indian residential societies.

## 028 — Builder treated as any other owner
**Date:** 2026-04-13
**Decision:** Builder ownership recorded same as any member.
No special UI treatment for builder-owned flats.
**Reason:** Keeps architecture consistent. Admin can see all
flats regardless of who owns them.

## 029 — My Home shows primary flat on dashboard
**Date:** 2026-04-13
**Decision:** Dashboard shows primary flat details only.
Full My Home screen shows all linked flats.
**Reason:** Dashboard must stay clean. Members with multiple
flats get full detail in My Home screen.

## 030 — Ownership self-assignment rules
**Date:** 2026-04-15
**Decision:**
Self-assignment to vacant flat allowed — builder needs to assign his own unsold flats, single admin needs
to assign their own flat when no one else can.

Self-assignment to flat with existing different owner blocked prevents rogue admin from silently adding
themselves to occupied flats.

Duplicate ownership by same person on same flat blocked. Occupancy self-assignment unrestricted for V1 —
caretakers and family members legitimately added.

**V2 additions planned (non-breaking):**
- Push notification to existing owners when new owner/occupant added (additive — side effect only)
- Builder approval for ownership assignments (additive — new status column + endpoint)
- Document upload requirement for ownership (additive — transferDocRef already in schema, NOT SURE)

**Why not fully block self-assignment:**
Builder has no one above them to assign their flats.
Single-admin societies have same problem.
Audit log tracks all assignments with actorId.

**Known V1 gap — occupancy self-assign:**
Builder/Admin can self-assign as occupant (CARETAKER, OWNER_RESIDENT etc) to any flat including occupied ones. This is intentional for V1 — occupancy is more fluid than ownership. Ownership is the legally sensitive record.
V2: add same self-assign restriction to occupancy if pilot feedback indicates abuse.

**Known V1 gaps with severity:**

MEDIUM (mitigated by audit log):
- Admin can end any ownership/occupancy silently
  Affected party not notified
  V2: push notifications on ownership changes

LOW (acceptable for V1):
- Occupancy self-assign not restricted
- No document verification for ownership
- No primary owner replacement prompt
- No rate limiting on unit endpoints
- AssignUnitScreen doesn't show existing assignment

All gaps tracked. Audit log captures all changes
with actorId. No critical or high severity gaps
remaining for V1 pilot.

## 031 — V1 trust model for unit management
**Date:** **Date:** 2026-04-15

V1 operates on a delegated trust model:
  Builder has ultimate authority
  Admin operates with builder's trust
  Residents have read-only access to own flat

This mirrors real Indian society management where
the RWA secretary (admin) has physical access to
all records. Vaastio digitizes this model.

Known architectural limitation:
  Owner cannot manage their own flat (read-only)
  All changes go through admin/builder
  This creates unnecessary admin dependency
  
V2: Add unit.manage_own permission for PRIMARY_OWNER
  Allows owner to manage co-owners and occupants
  of their own flat without admin intervention

Abuse mitigation for V1:
  All changes audit logged with actorId
  Rogue changes visible to affected resident
  in their My Home screen immediately
  Builder can review and reverse any change

Critical gap before scale:
  Push notifications for ownership/occupancy changes
  Must be implemented before >50 flat deployments
  Residents currently rely on active app checking

## Decision 032 — Gatekeeper needs society.view
**Date:** **Date:** 2026-04-21
Simple one liner — gatekeeper needs to view
society data to load dashboard

## Decision 033 — Auth flow visual design
**Date: 21 April 2026**
Decision: All auth screens use split layout —
indigo gradient header + white rounded card.
Montserrat font throughout auth flow.
Pattern inspired by premium fintech apps.
Reason: App targets builders and admins —
premium feel builds trust.
Welcome screen skipped for returning users
(token exists → goes straight to dashboard).

## Decision 034 — React version pinning for EAS monorepo
**Date:** 22 April 2026
**Decision:**
Pin react and react-dom to exact version 19.1.0 in apps/mobile/package.json (no ^ caret).
Add overrides block in root package.json to force single hoisted react version across all workspaces.

**Why:**
EAS runs npm ci on Linux from monorepo root.
npm ci requires lockfile to exactly match package.json.
react-native@0.81.5 renderer compiled against react@19.1.0.
react-dom requires exactly matching react version.
Caret ranges caused version mismatches between local Windows install and EAS Linux install.

**Rule for future:**
When adding new react-native packages that have peer dependency on react — check react-native's bundled renderer version first.
Never use ^ for react or react-dom in this project.
Always delete package-lock.json and reinstall after any react version change.

## Decision 035 — Event-driven notification architecture
**Date:** April 2026
**Decision:** Notifications use event emitter pattern.
Routes emit events. Dispatcher listens and sends.
Rules file is the single source of truth for
who gets notified and what message they receive.

**Adding new notification:**
  1. Add event name to events/emitter.ts
  2. Add rule to notifications/rules.ts
  3. Emit event from route

**Why not direct calls:**
  Direct calls couple business logic to notification logic.
  Event-driven keeps routes clean and notification
  behaviour changeable without touching routes.

## Decision 036 — FCM V1 over Legacy for Android push
**Date:** 23 April 2026
**Decision:** Use FCM V1 (service account) not FCM Legacy (server key).
Legacy deprecated by Google. V1 is more secure.
Service account JSON stored as EAS secret — never in git.

## Decision 037 — Single device token per user per device
**Date:** April 2026
**Decision:** Token stored in SecureStore on device.
Only re-registered when token changes.
Max 5 tokens per user (multiple devices supported).
Token reassigned to new userId when user switches accounts on same device — expected behaviour.

## Decision 038 — No timeout auto-allow
**Date:** 9 May 2026
  Entry stays PENDING indefinitely until gatekeeper acts.
  No automatic state changes.
  Gatekeeper is always responsible for final decision.
  If resident doesn't respond: gatekeeper calls on phone,
  then manually marks ALLOWED or TURNED_AWAY.
  All manual overrides are logged with gatekeeper's userId.

## Decision 039 — Pre-approval is single-use
**Date:** 9 May 2026
  Each pre-approval can only be used once.
  For recurring visitors (painting contractor this week):
  Resident marks them as FREQUENT instead.
  Keeps pre-approval clean and auditable.

## Decision 040 — Frequent visitor: gatekeeper decides
**Date:** 9 May 2026
  When frequent visitor arrives, gatekeeper sees FREQUENT badge.
  Gatekeeper can allow directly without notifying resident.
  OR can still notify — their choice.
  Resident controls who is marked frequent.
  Resident can revoke frequent status anytime.

## Decision 041 — Visitor record is society-scoped
**Date:** 9 May 2026
  Same person visiting twice = one visitor record, many entries.
  Gatekeeper searches before creating to avoid duplicates.
  Visitor record stores photo from most recent visit.

## Decision 042 — All occupants notified for approval
**Date:** 9 May 2026
  When visitor arrives for Flat 4B:
  All active occupants (Arjun + Meera) get notified.
  First to respond wins — PENDING → APPROVED/DENIED.
  Second responder sees entry already decided.
  notifiedAt only set when at least one push notification actually sent.

## Decision 043 — Duplicate visitor entries allowed in V1
**Date:** 18 May 2026
  No prevention if same visitor is logged twice while already inside.
  Gatekeeper is responsible for checking Active Visitors screen first.
  V2: add warning when visitor already has an active (entered, not exited) entry.

## Decision 044 — Actionable push notifications deferred to V2
**Date:** 18 May 2026
  Residents must open the app to approve or deny.
  Complexity of headless background task execution not justified for V1 scale.
  In-app fallback: MyVisitors Recent tab surfaces all pending entries
  so missed notifications don't block visitors indefinitely.

## Decision 045 — Notification persistence via expoPush.ts
Date: 19 May 2026
UserNotification records written inside expoPush.ts
after each push is sent. This means all notification
types are automatically persisted without changing
individual route files or event rules.
Single responsibility: expoPush handles both delivery
and persistence.

## Decision 046 — Cursor-based pagination for inbox
Date: 19 May 2026
20 items per page using createdAt as cursor.
No time limit on history — complete record kept in DB.
UI loads lazily via infinite scroll.

## Decision 047 — Soft delete only for member deactivation
Date: May 2026
Deactivation sets Membership.isActive = false.
No records are ever deleted. Complete history preserved.

## Decision 048 — Ownership preserved on deactivation
Date: May 2026
UnitOwnership records are legal records and never ended
on deactivation. Only UnitOccupancy is ended.

## Decision 049 — Active occupancies ended on deactivation
Date: May 2026
All active UnitOccupancy records for the member are
ended (occupiedUntil = now) when membership deactivated.

## Decision 050 — Last admin protection
Date: May 2026
Cannot deactivate the last active Admin in a society.
Endpoint returns 400 last_admin error.

## Decision 051 — Builder self-protection
Date: May 2026
Admin cannot deactivate a Builder.
Only another Builder can deactivate a Builder.

## Decision 052 — Pending visitor entries not auto-denied
Date: May 2026
When a member is deactivated, pending visitor entries
for their unit are NOT auto-denied.
Gatekeeper handles them manually.
Auto-deny would cause confusion if visitor is already
at gate.

## Decision 053 — Reactivation does not restore unit
Date: May 2026
Reactivating a member does not restore their previous
unit assignment. Admin must reassign unit manually.
Prevents stale occupancy data if unit was reassigned.

## Decision 054 — Device tokens not deleted on deactivation
Date: May 2026
Device tokens are per-user not per-society.
Deleting tokens would break push for other societies.
Deactivated member stops receiving society pushes
because their membership.isActive = false filters
them out of notification recipients.

## Decision 055 — Direct add creates full account
Date: 26 May 2026
Direct add creates Person + User + Membership immediately.
Member shows as Active in member list, not Pending.
Person logs in later and finds society already set up.

## Decision 056 — Direct add uses member.remove permission
Date: 26 May 2026
Direct add reuses member.remove permission (Builder + Admin).
Avoids creating a new permission for pilot scale.
Semantic: "managing members" covers both operations.

## Decision 057 — Admin cannot direct-add Builder or Admin
Date: 26 May 2026
Admin can direct-add: Resident, Co-resident, Gatekeeper.
Builder can direct-add: Admin, Resident, Co-resident, Gatekeeper.
Enforced in endpoint logic, not just permissions.

## Decision 058 — Phone and name required for direct add
Date: 26 May 2026
Both fields mandatory. No anonymous members.
Person can update their own name after logging in.

## Decision 059 — Unit assignment optional in direct add
Date: 26 May 2026
Admin can add member without unit — assign later.
Useful when unit not yet decided at time of adding.

## Decision 060 — Occupied unit warning in direct add
Date: 26 May 2026
If selected unit already has primary occupant,
new member is added as co-occupant (isPrimary: false).
No blocking — admin decides.

## Decision 061 — SMS notification on direct add is fire and forget
Date: 26 May 2026
SMS sent after successful direct add to notify person.
SMS failure never blocks the operation.
No sendSms utility exists — deferred for V1.

## Decision 062 — Inactive member detected during direct add
Date: 26 May 2026
If phone matches inactive member, returns 409 inactive_member
with memberId. Mobile shows reactivation option.
Reactivation does not restore unit (Decision 053).

## Decision 063 — Direct add wrapped in DB transaction
Date: 26 May 2026
All operations atomic: Person + User + Membership + Occupancy.
If any step fails, nothing is created.

## Decision 064 — Direct add entry via Members list
Date: 26 May 2026
+ button in MemberListScreen header shows action sheet:
Invite via SMS → InviteMemberScreen
Add Directly → DirectAddMemberScreen

## Decision 065 — Invite Member dashboard tile removed
Date: 26 May 2026
Functionality preserved via Members list header + button
which offers both Invite via SMS and Add Directly.
Single consolidated entry point is cleaner UX.

## Decision 066 — Dashboard tile renamed View Members to Members
Date: 26 May 2026
Noun not verb — standard navigation tile pattern.
MemberList screen header already showed Members correctly.

## Decision 067 — Society photoUrl on Organization model
Date: 27 May 2026
photoUrl added directly to Organization model as a column.
Structural field used everywhere like member photos.
Uploaded to Cloudinary vaastio/societies/ folder.
Requires migration.

## Decision 068 — Society settings in OrganizationSetting table
Date: 27 May 2026
contactPhone, contactEmail, description stored as
key-value pairs in existing OrganizationSetting table.
Flexible — new settings can be added later without
schema changes. Upserted via PATCH /societies/:id/settings.

## Decision 069 — Admin cannot edit structural society info
Date: 27 May 2026
Admin can edit: photo, contactPhone, contactEmail, description.
Admin cannot edit: name, address, city, state, pincode, type.
Structural info is builder-owned — they created the project.
Enforced in endpoint logic not just permissions.

## Decision 070 — Society type fixed after creation
Date: 27 May 2026
OrgType (APARTMENT/VILLA/MIXED/PLOTTED) cannot be changed
after society is created. Changing type mid-way causes
confusion in unit structure and member expectations.
Omitted from PATCH /societies/:id for Admin role.

## Decision 071 — Society info read-only for residents
Date: 27 May 2026
Residents see: photo, name, description, contactPhone,
contactEmail via SocietyInfoScreen (read-only).
They cannot edit anything.
Contact phone shown with tap-to-call button.

## Decision 072 — Society card on dashboard shows photo
Date: 27 May 2026
If society has photoUrl set, shown on dashboard card
replacing the letter avatar.
Falls back to letter avatar if no photo.

## Decision 073 — Handover V1 scope: Builder leaves society
Date: 31 May 2026
V1 handover = Builder deactivates own membership.
Full role transfer (promoting Admin to Builder level)
deferred to V2. Covers 80% of real handover scenarios.
Builder who just stops using app is also acceptable
for pilot scale.

## Decision 074 — Leave society requires active Admin
Date: 31 May 2026
Builder cannot leave if no active Admin exists.
Prevents society becoming unmanaged.
Error shown: "Add an Admin before leaving."
Last admin protection also updated: when no Builder
exists in society, last Admin cannot be deactivated.

## Decision 075 — tokenVersion incremented on leave
Date: 31 May 2026
When Builder leaves, user.tokenVersion incremented.
All active JWT sessions immediately invalidated.
Builder must re-login to access other societies.
Security: prevents stale token from accessing
society after membership deactivated.

## Decision 076 — Admin structural edit limitation after handover
Date: 31 May 2026
Admin cannot edit society name, address, type after
Builder leaves. Accepted V1 limitation.
Society name and address rarely change post-construction.
Fix in V2 via role promotion or Society Owner role.

## Decision 077 — Builder reactivation via support only
Date: 31 May 2026
If Builder wants to rejoin after leaving,
requires manual reactivation by Inspirebyte team.
Self-reactivation flow deferred to V2.
Admin cannot reactivate Builder (existing rule).

## Decision 078 — Two confirmation dialogs for Leave Society
Date: 31 May 2026
Destructive action requires double confirmation.
Dialog 1: summary of what will happen
Dialog 2: final irreversible warning
No OTP confirmation — too much friction for pilot.

## Decision 079 — Builder data preserved after leave
Date: 31 May 2026
All Builder-created content preserved after leaving:
announcements, complaints, units, structure.
createdBy references remain for audit trail.
No orphaned data. Society continues without interruption.

## Decision 080 — Leave Society entry via Society Settings
Date: 31 May 2026
"Leave Society" button at bottom of SocietySettingsScreen.
Styled as destructive (red). Visible to Builder only.
Not in profile — this is a society-level action.

## Decision 081 — JWT secrets required at startup
Date: 2 June 2026
Server refuses to start if JWT_SECRET or
JWT_REFRESH_SECRET is missing or under 32 characters.
Fails loudly rather than booting with a known default.
See jwt.ts requireSecret() function.

## Decision 082 — Cryptographically secure OTP
Date: 2 June 2026
OTP generation uses crypto.randomInt() not Math.random().
Math.random() is not cryptographically secure and V8's
PRNG state can be recovered from observed outputs.

## Decision 083 — Notification inbox persisted before push
Date: 2 June 2026
UserNotification records written before device token
check in expoPush.ts. Users without registered devices
still receive inbox notifications. Fixes violation of
Decision 045 where early return skipped persistence.

## Decision 084 — Atomic visitor approve/deny
Date: 2 June 2026
Approve and reject use updateMany with status: PENDING
guard. result.count === 0 means another occupant already
responded. Returns entry_not_pending (409).
Prevents last-write-wins race between co-occupants.

## Decision 085 — Audit logs inside transactions
Date: 2 June 2026
All member state changes (deactivate, moveout, reactivate)
wrap state change + audit log in single $transaction.
Prevents state change with missing audit trail.

## Decision 086 — Trust proxy for rate limiting
Date: 2 June 2026
app.set('trust proxy', 1) ensures req.ip is the real
client IP behind Render's load balancer.
OTP rate limit bypass narrowed to test environment only.
Development now subject to same rate limits as production.

## Decision 087 — End unit occupancy without deactivation
Date: 04 June 2026
New operation: end a member's occupancy for a specific
unit without deactivating their society membership.
Separate from "Mark as Moved Out" which ends both.
Use case: member transfers between units in same society.
getMember returns all active occupancies (was findFirst,
now findMany ordered by occupiedFrom asc).
One End Occupancy button shown per active occupancy.

## Decision 088 — Primary occupant gap when primary leaves
Date: 04 June 2026
When primary occupant's occupancy is ended and
co-occupants exist, no auto-promotion happens.
Unit temporarily has no primary occupant.
Admin must manually assign new primary.
Avoids assumptions about who should be primary.

## Decision 089 — Admin gets node.create and node.delete
Date: 04 June 2026
Admin role given node.create and node.delete permissions.
Previously Admin had only node.update and node.view.
Required for societies to remain manageable after
Builder leaves via handover.
Applied via seed update to production Neon DB.

## Decision 090 — Announcements cursor pagination
Date: 04 June 2026
GET /announcements paginated with cursor-based approach.
Default 20 per page, max 50.
cursor = createdAt of last item on page.
Pinned announcements sorted first — appear on page 1.
Mobile uses FlatList onEndReached for infinite scroll.
Pull to refresh resets to page 1.
Category filter change resets cursor.

## Decision 091 — Members list pagination deferred
Date: 04 June 2026
Members list uses ScrollView not FlatList.
Refactoring to FlatList with three sections
(Active, Pending, Inactive) is complex.
Acceptable for pilot scale (50-200 members).
Defer until society approaches 500+ members.

## Decision 092 — Visitor entries cap at 50 accepted
Date: 04 June 2026
GET /entries has hardcoded take: 50.
Returns 50 most recent entries.
Date and status filters help narrow results.
Acceptable for pilot — full pagination deferred.