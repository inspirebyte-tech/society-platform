import { appEvents, Events } from '../events/emitter'
import { notificationRules } from './rules'
import { sendPushToUsers } from '../utils/expoPush'

// ─────────────────────────────────────────────
// Dispatcher — never changes
// Listens to all events and processes them
// using the rules defined in rules.ts
// ─────────────────────────────────────────────
export const initNotificationDispatcher = (): void => {
  Object.entries(notificationRules).forEach(([event, rule]) => {
    if (!rule) return

    appEvents.on(event, async (data: any) => {
      try {
        const userIds = await rule.recipients(data)

        if (!userIds.length) return

        const payload = rule.payload(data)

        await sendPushToUsers(userIds, payload)
      } catch (error) {
        // Never crash the main request flow
        // Notification failure is non-fatal
        console.error(`Notification dispatch failed for ${event}:`, error)
      }
    })
  })

  console.log(
    `Notification dispatcher initialized with ${Object.keys(notificationRules).length} rules`
  )
}