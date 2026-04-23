import EventEmitter from 'events'

export const appEvents = new EventEmitter()

// All application events in one place.
// Adding a new event = add one line here.
export const Events = {
  // Complaints
  COMPLAINT_CREATED:    'complaint.created',
  COMPLAINT_RESOLVED:   'complaint.resolved',
  COMPLAINT_REJECTED:   'complaint.rejected',

  // Members
  MEMBER_JOINED:        'member.joined',
  MEMBER_DEACTIVATED:   'member.deactivated',

  // Announcements (ready for when feature is built)
  ANNOUNCEMENT_CREATED: 'announcement.created',

  // Visitor management (ready for when feature is built)
  VISITOR_AT_GATE:      'visitor.at_gate',
  VISITOR_APPROVED:     'visitor.approved',
  VISITOR_REJECTED:     'visitor.rejected',

  // Emergency
  EMERGENCY_DECLARED:   'emergency.declared',

  // Units (V2)
  UNIT_OWNERSHIP_CHANGED: 'unit.ownership_changed',
} as const

export type AppEvent = typeof Events[keyof typeof Events]