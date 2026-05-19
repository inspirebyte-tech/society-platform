import api from './api'

export interface InboxNotification {
  id: string
  title: string
  body: string
  screen?: string
  data?: Record<string, string>
  isRead: boolean
  createdAt: string
}

export async function getNotifications(before?: string): Promise<{
  notifications: InboxNotification[]
  hasMore: boolean
  nextCursor: string | null
}> {
  const params: Record<string, string | number> = { limit: 20 }
  if (before) params.before = before
  const res = await api.get('/notifications', { params })
  return res.data.data
}

export async function markNotificationsRead(ids?: string[]): Promise<{ updated: number }> {
  const body = ids && ids.length > 0 ? { ids } : {}
  const res = await api.patch('/notifications/read', body)
  return res.data.data
}

export async function getUnreadCount(): Promise<{ count: number }> {
  const res = await api.get('/notifications/unread-count')
  return res.data.data
}
