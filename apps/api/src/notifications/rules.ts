import { Events } from '../events/emitter'
import { PushPayload, getUserIdsByRole, getAllUserIds } from '../utils/expoPush'
import { prisma } from '../lib/prisma'

// ─────────────────────────────────────────────
// Rule definition type
// Each rule defines:
//   recipients — who gets this notification
//   payload — what they receive
// ─────────────────────────────────────────────
interface NotificationRule {
  recipients: (data: any) => Promise<string[]>
  payload: (data: any) => PushPayload
}

// ─────────────────────────────────────────────
// THE RULES FILE
// This is the only file you touch to:
//   - Change who gets a notification
//   - Change the message content
//   - Add a new notification type
//   - Disable a notification
// ─────────────────────────────────────────────
export const notificationRules: Partial<Record<string, NotificationRule>> = {

  // ─────────────────────────────────────────────
  // COMPLAINTS
  // ─────────────────────────────────────────────
  [Events.COMPLAINT_CREATED]: {
    recipients: async (d) =>
      getUserIdsByRole(d.orgId, ['Builder', 'Admin']),
    payload: (d) => ({
      title: 'New Complaint',
      body: `${d.raisedBy} raised: ${d.title}`,
      data: {
        screen: 'ComplaintDetail',
        complaintId: d.complaintId,
        orgId: d.orgId,
      }
    })
  },

  [Events.COMPLAINT_RESOLVED]: {
    recipients: async (d) => [d.raisedByUserId],
    payload: (d) => ({
      title: 'Complaint Resolved',
      body: `Your complaint "${d.title}" has been resolved`,
      data: {
        screen: 'ComplaintDetail',
        complaintId: d.complaintId,
        orgId: d.orgId,
      }
    })
  },

  [Events.COMPLAINT_REJECTED]: {
    recipients: async (d) => [d.raisedByUserId],
    payload: (d) => ({
      title: 'Complaint Update',
      body: `Your complaint "${d.title}" could not be resolved`,
      data: {
        screen: 'ComplaintDetail',
        complaintId: d.complaintId,
        orgId: d.orgId,
      }
    })
  },

  // ─────────────────────────────────────────────
  // MEMBERS
  // ─────────────────────────────────────────────
  [Events.MEMBER_JOINED]: {
    recipients: async (d) =>
      getUserIdsByRole(d.orgId, ['Builder', 'Admin']),
    payload: (d) => ({
      title: 'New Member',
      body: `${d.name} has joined ${d.societyName}`,
      data: {
        screen: 'MemberDetail',
        memberId: d.memberId,
        orgId: d.orgId,
      }
    })
  },

  // ─────────────────────────────────────────────
  // ANNOUNCEMENTS
  // Ready for when announcements feature is built
  // ─────────────────────────────────────────────
  [Events.ANNOUNCEMENT_CREATED]: {
    recipients: async (d) =>
      getAllUserIds(d.orgId, d.createdByUserId),
    payload: (d) => ({
      title: d.societyName,
      body: d.title,
      priority: d.category === 'EMERGENCY' ? 'high' : 'default',
      data: {
        screen: 'Announcements',
        orgId: d.orgId,
      }
    })
  },

  // ─────────────────────────────────────────────
  // EMERGENCY
  // High priority — goes to everyone
  // ─────────────────────────────────────────────
  [Events.EMERGENCY_DECLARED]: {
    recipients: async (d) =>
      getAllUserIds(d.orgId),
    payload: (d) => ({
      title: '🚨 Emergency Alert',
      body: d.message,
      priority: 'high' as const,
      data: {
        screen: 'Dashboard',
        orgId: d.orgId,
      }
    })
  },

}