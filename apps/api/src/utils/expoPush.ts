import Expo, { ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk'
import { prisma } from '../lib/prisma'

const expo = new Expo()

export interface PushPayload {
  title: string
  body: string
  data?: Record<string, string>
  priority?: 'default' | 'normal' | 'high'
}

// ─────────────────────────────────────────────
// Send to a list of userIds
// Fetches their device tokens automatically
// ─────────────────────────────────────────────
export const sendPushToUsers = async (
  userIds: string[],
  payload: PushPayload
): Promise<void> => {
  if (!userIds.length) return

  // Get all active device tokens for these users
  const deviceTokens = await prisma.deviceToken.findMany({
    where: { userId: { in: userIds } }
  })

  if (!deviceTokens.length) return

  const messages: ExpoPushMessage[] = deviceTokens
    .filter(dt => Expo.isExpoPushToken(dt.token))
    .map(dt => ({
      to: dt.token,
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
      sound: 'default',
      priority: payload.priority ?? 'default',
    }))

  if (!messages.length) return

  // Expo handles chunking for large batches
  const chunks = expo.chunkPushNotifications(messages)
  const tickets: ExpoPushTicket[] = []

  for (const chunk of chunks) {
    try {
      const chunkTickets = await expo.sendPushNotificationsAsync(chunk)
      tickets.push(...chunkTickets)
    } catch (error) {
      console.error('Expo push chunk failed:', error)
    }
  }

  // Handle expired/invalid tokens — clean them up
  const expiredTokens: string[] = []

  tickets.forEach((ticket, i) => {
    if (ticket.status === 'error') {
      console.error(`Push notification error:`, ticket.message)
      if (
        ticket.details?.error === 'DeviceNotRegistered' ||
        ticket.details?.error === 'InvalidCredentials'
      ) {
        const token = (messages[i].to as string)
        expiredTokens.push(token)
      }
    }
  })

  // Delete expired tokens from DB
  if (expiredTokens.length) {
    await prisma.deviceToken.deleteMany({
      where: { token: { in: expiredTokens } }
    })
  }
}

// ─────────────────────────────────────────────
// Helper — get all active member userIds in a society
// ─────────────────────────────────────────────
export const getUserIdsByRole = async (
  orgId: string,
  roleNames: string[]
): Promise<string[]> => {
  const memberships = await prisma.membership.findMany({
    where: {
      orgId,
      isActive: true,
      role: { name: { in: roleNames } }
    },
    select: { userId: true }
  })
  return memberships.map(m => m.userId)
}

// ─────────────────────────────────────────────
// Helper — get ALL active member userIds in a society
// ─────────────────────────────────────────────
export const getAllUserIds = async (
  orgId: string,
  excludeUserId?: string
): Promise<string[]> => {
  const memberships = await prisma.membership.findMany({
    where: {
      orgId,
      isActive: true,
      ...(excludeUserId ? { userId: { not: excludeUserId } } : {})
    },
    select: { userId: true }
  })
  return memberships.map(m => m.userId)
}

// ─────────────────────────────────────────────
// Clean up old tokens when user has too many
// Called after registering a new device token
// ─────────────────────────────────────────────
const MAX_TOKENS_PER_USER = 5

export const cleanupOldTokens = async (
  userId: string
): Promise<void> => {
  const tokens = await prisma.deviceToken.findMany({
    where: { userId },
    orderBy: { updatedAt: 'asc' }
  })

  if (tokens.length >= MAX_TOKENS_PER_USER) {
    const toDelete = tokens.slice(0, tokens.length - MAX_TOKENS_PER_USER + 1)
    await prisma.deviceToken.deleteMany({
      where: {
        id: { in: toDelete.map(t => t.id) }
      }
    })
  }
}