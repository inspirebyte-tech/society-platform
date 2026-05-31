# Society Handover — Feature Brief

## Overview
Allow a Builder to formally leave a society, transferring
day-to-day management to the Admin/RWA. This represents
the end of the builder's active involvement in the society.

## V1 Scope
Builder leaves society (deactivates own membership).
Full role transfer (Builder → Admin promotion) is V2.

## Who Can Do This
Builder only. Admin cannot trigger handover.

## Pre-conditions (enforced before leave allowed)
1. At least one active Admin must exist in society
2. Society must have at least one other active member

## What Happens On Leave
1. Builder membership set to isActive: false
2. user.tokenVersion incremented (all sessions invalidated)
3. AuditLog entry written
4. Builder redirected away from this society

## What Does NOT Happen
- Data is not deleted
- Other members unaffected
- Society continues normally under Admin
- Builder-created content (announcements, complaints etc)
  preserved with historical createdBy reference

## Post-Leave Limitations (V1)
- Admin cannot edit structural society info
  (name, address, type) — accepted V1 limitation
- Builder reactivation requires Inspirebyte support
- No self-reactivation flow

## Entry Point
Society Settings screen → "Leave Society" button
at the bottom, styled as destructive action.
Only visible to Builder role.

## Flow
1. Tap "Leave Society"
2. System checks: active Admin exists?
   No → block with guidance message
3. Two confirmation dialogs (destructive action)
4. API call → leave
5. Navigate away from society

## Endpoint
PATCH /societies/:id/leave
Auth: Builder only (enforced in logic, not just permission)
Guards: active Admin must exist

## Decisions
D073-D080 (see DECISIONS.md)