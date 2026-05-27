# Society Settings — Feature Brief

## Overview
Allow builders and admins to manage society profile
information. Residents get a read-only info view.

## Who Can Edit What

### Builder
- Society name, address, city, state, pincode, type
- Society photo
- Contact phone, contact email, description

### Admin  
- Society photo
- Contact phone, contact email, description
- Cannot edit name, address, type (structural info)

### Resident / Co-resident / Gatekeeper
- Read-only view: photo, name, description,
  contact phone, contact email

## Schema Changes
- Add photoUrl String? to Organization model
- contactPhone, contactEmail, description stored
  in existing OrganizationSetting table (key-value)

## Endpoints
- PATCH /societies/:id — extended with photoUrl
- PATCH /societies/:id/settings — NEW
  Accepts: contactPhone, contactEmail, description
- GET /societies/:id — extended to return new fields
  including settings from OrganizationSetting

## Mobile Screens
- SocietySettingsScreen — edit view (Builder/Admin)
- SocietyInfoScreen — read-only view (all roles)
- DashboardScreen — society card shows photo

## Decisions
- D067: photoUrl on Organization model (structural field)
- D068: contactPhone/email/description in OrganizationSetting
- D069: Admin cannot edit name/address/type
- D070: Society type fixed after creation
- D071: Society photo uploaded to vaastio/societies/ folder
- D072: Residents see contact info but cannot edit