# Feature Brief: Notification Foundation

## Overview
Build the push notification infrastructure before
complaint management. This foundation powers complaints,
gate entry, and announcements. Build once, use everywhere.
Retrofitting notifications into already-built features
costs significantly more than building the pipe now.

---

## Why This Comes First
Three upcoming features need push notifications:
  Complaint Management — admin notified of new complaints
  Gate Entry — resident notified when visitor arrives (critical)
  Announcements — all residents notified of new posts

Gate entry is Vaastio's most important resident-facing
feature. Without real-time push notifications, gate entry
is just a log — not an interactive approval flow.
This foundation must exist before those features are built.

---

## Who Uses It
Every logged in user — token registered on login.
No roles or permissions involved.
Infrastructure only — not a user-facing feature.

---

## What It Does

### Device Token Storage
When user logs in and opens the app:
  App requests notification permission from user
  If granted — gets Expo push token (device-specific string)
  Sends token to backend
  Backend stores against userId
  
One user can have multiple tokens:
  Different devices
  App reinstalled — generates new token
  Old tokens cleaned up automatically

### Push Notification Delivery
Backend utility function:
  sendPushNotification(userId, title, body)
  Looks up all device tokens for that userId
  Sends via Expo Push API
  Handles failures gracefully — never crashes main flow
  Logs failures silently for debugging

Bulk utility for future use:
  sendBulkNotification(userIds[], title, body)
  Used when announcements feature is built
  Chunked sends to handle Expo API limits

### Notification Events — Defined Per Feature
Each feature brief defines its own notification events.
This foundation just provides the delivery mechanism.

---

## What It Does NOT Do
- No notification preferences (V2)
- No notification history screen (V2)
- No in-app notification bell (V2)
- No scheduled or digest notifications (V2)
- No silent background notifications (V2)
- No iOS badge count management (V2)

---

## User Flows

### Flow 1 — First Time Token Registration
User completes OTP login
→ Society selected (session token ready)
→ App requests notification permission
→ User taps Allow
→ App receives Expo push token
→ POST /auth/device-token sent to backend
→ Token stored silently
→ User lands on dashboard — no interruption

### Flow 2 — Token Already Registered
User opens app after previous session
→ App checks locally stored token
→ If same as current Expo token → skip registration
→ If different (reinstalled, new device) → re-register
→ Silent — no user action needed

### Flow 3 — User Denies Permission
User taps Don't Allow on permission prompt
→ No token registered
→ App continues normally
→ User simply won't receive push notifications
→ No error. No blocking. Silent degradation.
→ App still works fully without notifications

---

## Edge Cases

User reinstalls the app:
  New Expo token generated
  Old token becomes invalid
  New token registered on next login
  Expo handles delivery failures gracefully
  Old tokens cleaned up from DB after 5 accumulate

User has multiple devices:
  Each device registers its own token
  All tokens stored
  Notification sent to all devices for that userId

Notification delivery fails:
  Token expired or app uninstalled
  Expo returns error
  Backend logs failure silently
  Main request flow continues unaffected
  Never throw. Never crash.

User denies permission then changes mind:
  Goes to phone settings → enables notifications
  Next app open → token registration attempted again
  Works automatically

---

## Database Changes

New table: device_tokens
  id         → uuid primary key
  userId     → references users
  token      → unique string (Expo push token)
  platform   → IOS or ANDROID enum
  createdAt
  updatedAt

Index on userId for fast token lookup.

New enum: Platform
  IOS
  ANDROID

---

## API Endpoint Needed

### POST /auth/device-token
Register device push token.

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

400 missing_field    → token or platform not provided
400 invalid_platform → not IOS or ANDROID
401 no_token         → not logged in

**Behaviour:**
If token already exists → update updatedAt (upsert)
If userId has 5+ tokens → delete oldest first

---

## Files To Create

apps/api/src/utils/notifications.ts
apps/api/src/routes/deviceTokens.ts
prisma/migrations/XXXXX_add_device_tokens/

## Files To Update

apps/api/src/app.ts     → register device token route
prisma/schema.prisma    → DeviceToken model + Platform enum
docs/API.md             → POST /auth/device-token endpoint

---

## V2 Plans
Notification preferences per user
  Each user chooses which notifications to receive
  Stored in user_preferences table

Notification history screen
  List of all past notifications in app
  Unread count badge on dashboard

Digest mode
  Daily summary instead of per-event
  For users who prefer less interruption

iOS badge count
  Number badge on app icon
  Shows unread notification count

---

## Definition of Done
□ device_tokens table created via migration
□ POST /auth/device-token endpoint works
□ Token upserted correctly — no duplicates
□ Old tokens cleaned up when limit reached
□ sendPushNotification utility built and tested
□ sendBulkNotification utility built
□ Mobile registers token after login
□ Mobile handles permission denied gracefully
□ Test notification received on real device
□ API.md updated
□ DECISIONS.md updated
□ PR merged to dev

---

## Out of Scope
- Notification preferences
- Notification history
- In-app notification center
- Scheduled notifications
- Analytics on notification delivery
