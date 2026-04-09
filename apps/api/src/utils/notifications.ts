import { prisma } from '../lib/prisma'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const MAX_TOKENS_PER_USER = 5

interface PushMessage {
  to: string
  title: string
  body: string
  data?: Record<string, unknown>
}

export const sendPushNotification = async (
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> => {
  try {
    const tokens = await prisma.deviceToken.findMany({
      where: { userId },
      select: { token: true }
    })

    if (tokens.length === 0) return

    const messages: PushMessage[] = tokens.map(({ token }) => ({
      to: token,
      title,
      body,
      data: data ?? {}
    }))

    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(messages)
    })

  } catch (error) {
    // Never throw — notification failure must not crash main flow
    console.error('Push notification failed:', error)
  }
}

export const sendBulkNotification = async (
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> => {
  try {
    if (userIds.length === 0) return

    const tokens = await prisma.deviceToken.findMany({
      where: { userId: { in: userIds } },
      select: { token: true }
    })

    if (tokens.length === 0) return

    // Expo limit — 100 messages per request
    const chunks = []
    for (let i = 0; i < tokens.length; i += 100) {
      chunks.push(tokens.slice(i, i + 100))
    }

    for (const chunk of chunks) {
      const messages: PushMessage[] = chunk.map(({ token }) => ({
        to: token,
        title,
        body,
        data: data ?? {}
      }))

      await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messages)
      })
    }

  } catch (error) {
    console.error('Bulk push notification failed:', error)
  }
}

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