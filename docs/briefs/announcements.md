# Announcements Feature Brief

## Overview
Society-wide announcements posted by Builder/Admin.
All members receive push notification on new announcement.

## Who Can Post
Builder, Admin

## Who Can See
All active members

## Categories
GENERAL, MAINTENANCE, MEETING, EMERGENCY, CELEBRATION

## Images
Up to 5 images per announcement (base64 → Cloudinary)

## Pinning
Max 3 pinned announcements at a time
Builder/Admin can pin/unpin
Pinned always shows at top of list

## Deletion
Hard delete — manual only, no auto-expiry

## Endpoints
POST   /api/societies/:id/announcements
GET    /api/societies/:id/announcements
GET    /api/societies/:id/announcements/:announcementId
PATCH  /api/societies/:id/announcements/:announcementId/pin
DELETE /api/societies/:id/announcements/:announcementId

## Permissions
announcement.create → Builder, Admin
announcement.delete → Builder, Admin
announcement.pin    → Builder, Admin
announcement.view   → All roles

## Notifications
ANNOUNCEMENT_CREATED → all members except creator
Emergency category → high priority notification