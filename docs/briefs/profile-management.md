# Profile Management — Feature Brief

## Overview
Allow users to upload and update a profile photo.
Name editing already exists. Phone change deferred.

## Who It Affects
All roles — every user can set a profile photo.

## What Gets Built

### Backend
- Extend PATCH /api/auth/profile to accept photoUrl
- Upload handled client-side to Cloudinary
- Store photoUrl on Person model

### Mobile
- Tap avatar in dashboard header → options:
  "Change Photo" and "Edit Name" (existing)
- Photo picker: camera or gallery
- Upload to Cloudinary via existing upload utility
- Show actual photo in dashboard header avatar
- Show actual photo in profile bottom sheet
- Fallback to initials if no photo set

## What Is NOT Built
- Phone number change (complex, deferred)
- Email field (not in scope)
- My Home / flat details (already exists in My Home screen)

## Schema Change
Person model already has photoUrl field — no migration needed.
Just need to expose it through the profile endpoint.