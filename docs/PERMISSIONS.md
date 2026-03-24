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

### Society
```
society.create    → create a new society
society.update    → edit society details
society.view      → view society information
```

### Structure (nodes)
```
node.create       → add towers, wings, units to society
node.update       → edit node details
node.delete       → remove nodes from society
node.view         → view society structure
```

### Members
```
member.view       → view society members list
member.remove     → remove a member from society
```

### Invitations
```
invitation.create → invite someone to society
invitation.cancel → cancel a pending invitation
invitation.view   → view pending invitations
```

### Ownership
```
ownership.assign  → link an owner to a unit
ownership.remove  → remove ownership record
ownership.view    → view ownership records
```

### Occupancy
```
occupancy.assign  → link a resident or tenant to a unit
occupancy.remove  → mark someone as moved out
occupancy.view    → view occupancy records
```

### Complaints
```
complaint.create        → raise a new complaint
complaint.view_own      → view own complaints only
complaint.view_all      → view all society complaints
complaint.update_status → change status, add updates
complaint.broadcast     → send update to all residents
```

### Announcements
```
announcement.create     → create announcements and events
announcement.view       → view announcements
```

### Visitors
```
visitor.log             → log a visitor at gate
visitor.approve         → approve or deny a visitor
visitor.view_own        → view own visitor history
visitor.view_live       → view who is currently inside
visitor.view_emergency  → full visitor log access
```

### Services
```
service.create          → add to society services directory
service.view            → view services directory
service.manage_personal → manage own personal staff list
```

### Polls
```
poll.create             → create a poll
poll.vote               → vote on a poll
poll.view               → view polls and results
```

### Emergency
```
emergency.declare       → declare an emergency
emergency.view          → view emergencies
```

### Assets
```
asset.create            → define a bookable asset
asset.book              → make a booking
asset.view              → view available assets
asset.manage_booking    → approve, reject, cancel bookings
```

### Roles
```
role.create             → create custom roles
role.assign             → assign roles to members
role.view               → view roles and permissions
```

### Co-resident
```
co_resident.invite      → invite a co-resident to your flat
                          cannot be further delegated
```

---

## Default Role Bundles

### Builder
```
society.create, society.update, society.view
node.create, node.update, node.delete, node.view
member.view, member.remove
invitation.create, invitation.cancel, invitation.view
ownership.assign, ownership.remove, ownership.view
occupancy.assign, occupancy.remove, occupancy.view
complaint.create, complaint.view_all
complaint.update_status, complaint.broadcast
announcement.create, announcement.view
visitor.view_live, visitor.view_emergency
emergency.declare, emergency.view
role.create, role.assign, role.view
```

### Admin
```
society.update, society.view
node.update, node.view
member.view, member.remove
invitation.create, invitation.cancel, invitation.view
ownership.assign, ownership.remove, ownership.view
occupancy.assign, occupancy.remove, occupancy.view
complaint.view_all, complaint.update_status, complaint.broadcast
announcement.create, announcement.view
visitor.view_live, visitor.view_emergency
service.create, service.view
poll.create, poll.vote, poll.view
emergency.declare, emergency.view
asset.create, asset.book, asset.view, asset.manage_booking
role.create, role.assign, role.view
```

### Resident
```
society.view, node.view
complaint.create, complaint.view_own
announcement.view
visitor.approve, visitor.view_own
service.view, service.manage_personal
poll.vote, poll.view
emergency.declare, emergency.view
asset.book, asset.view
co_resident.invite
```

### Co-resident
```
society.view, node.view
complaint.create, complaint.view_own
announcement.view
visitor.approve, visitor.view_own
service.view
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