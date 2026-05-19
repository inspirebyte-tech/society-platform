# Notification Inbox — Feature Brief

## Overview
Every push notification sent to a user is also stored
in the database. Users can view full notification history
in an inbox screen accessible from the dashboard.

## Who Sees It
All roles — every user has a notification inbox.

## What Goes In Inbox
All 8 current notification types:
  COMPLAINT_CREATED, COMPLAINT_RESOLVED, COMPLAINT_REJECTED
  ANNOUNCEMENT_CREATED
  VISITOR_AT_GATE, VISITOR_APPROVED, VISITOR_DENIED
  VISITOR_PRE_APPROVAL_USED

## Pagination
20 notifications per page.
Cursor-based (before= param using createdAt).
No time limit — complete history preserved in DB.

## Mark As Read
Tap notification → marks that one read + navigates.
3 seconds in inbox → marks all visible as read.
Bell badge shows total unread count.

## Badge Location
Bell icon in dashboard header (tab bar in V2).

## Endpoints
GET  /notifications               paginated list
PATCH /notifications/read         mark read (one or all)
GET  /notifications/unread-count  badge count

## Implementation Note
Notifications written to DB inside expoPush.ts
after push is sent. Single change covers all types.