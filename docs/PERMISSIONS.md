# Permissions

## How Permissions Work

Every action in the system is represented as a permission string.
Roles are bundles of permission strings.
When a user makes a request, middleware checks:
```
Does this user's role in this org include the required permission?
YES → proceed
NO  → 403 Forbidden
```

Permissions are stored in the database.
New permissions are added via seed or migration.
New roles are database inserts — zero code change.

---

## All Permission Strings

### Organisation
```
org.create          → create a new society
```

### Units
```
unit.create         → add units to a society
unit.update         → edit unit details
unit.view           → view unit list and details
```

### Members
```
member.invite       → invite a person to the platform
member.remove       → deactivate a member
member.view         → view member list
```

### Ownership and Occupancy
```
ownership.assign    → link an owner to a unit
occupancy.assign    → link a tenant or resident to a unit
occupancy.remove    → mark a person as moved out
```

### Complaints
```
complaint.create         → raise a new complaint
complaint.view_own       → view own complaints only
complaint.view_all       → view all complaints in the society
complaint.update_status  → change complaint status, add updates
complaint.broadcast      → send complaint update to all residents
```

### Announcements
```
announcement.create      → create announcements and events
announcement.view        → view announcements
```

### Visitors
```
visitor.log              → log a visitor arrival at gate
visitor.approve          → approve or deny a visitor request
visitor.view_own         → view own visitor history
visitor.view_live        → view who is currently inside
visitor.view_emergency   → full visitor log access (admin/emergency)
```

### Services Directory
```
service.create           → add a service to society directory
service.view             → view society services directory
service.manage_personal  → manage own personal staff list
```

### Polls
```
poll.create              → create a poll
poll.vote                → vote on a poll
poll.view                → view polls and results
```

### Emergencies
```
emergency.declare        → declare an emergency
emergency.view           → view active and past emergencies
```

### Assets
```
asset.create             → define a bookable asset or amenity
asset.book               → make a booking
asset.view               → view available assets and bookings
asset.manage_booking     → approve, reject, cancel any booking
```

### Roles
```
role.create              → create custom roles
role.assign              → assign roles to members
```

---

## Default Role Bundles

### Builder
```
org.create
unit.create, unit.update, unit.view
member.invite, member.remove, member.view
ownership.assign
occupancy.assign, occupancy.remove
complaint.create, complaint.view_all, complaint.update_status, complaint.broadcast
announcement.create, announcement.view
visitor.view_live, visitor.view_emergency
emergency.declare, emergency.view
role.create, role.assign
```

### Admin
```
unit.update, unit.view
member.invite, member.remove, member.view
ownership.assign
occupancy.assign, occupancy.remove
complaint.view_all, complaint.update_status, complaint.broadcast
announcement.create, announcement.view
visitor.view_live, visitor.view_emergency
service.create, service.view
poll.create, poll.view
emergency.declare, emergency.view
asset.create, asset.view, asset.manage_booking
role.create, role.assign
```

### Resident
```
complaint.create, complaint.view_own
announcement.view
visitor.approve, visitor.view_own
service.view, service.manage_personal
poll.vote, poll.view
emergency.declare, emergency.view
asset.book, asset.view
```

### Gatekeeper
```
visitor.log, visitor.view_live
emergency.declare, emergency.view
```

---

## Custom Roles

Admins can create custom roles per society.
Examples:
- Security Supervisor (gatekeeper + visitor.view_emergency)
- Treasurer (specific billing permissions when V2 ships)
- Maintenance Manager (complaint.view_all + complaint.update_status)

Custom roles are created via the admin dashboard.
They are stored in the roles table with org_id set.
System roles have org_id null and cannot be modified.

---

## Adding New Permissions

When a new feature is built:

1. Add permission strings to the permissions table via seed or migration
2. Decide which default roles get the new permission
3. Update role_permissions via migration
4. Use requirePermission('new.permission') on the new route
5. Update this document

Never hardcode role checks in route handlers.
Always use the permission middleware.