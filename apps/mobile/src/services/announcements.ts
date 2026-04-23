import api from './api'

export type AnnouncementCategory = 'GENERAL' | 'MAINTENANCE' | 'MEETING' | 'EMERGENCY' | 'CELEBRATION'

export interface Announcement {
  id: string
  title: string
  body: string
  category: AnnouncementCategory
  isPinned: boolean
  images: { id: string; imageUrl: string }[]
  createdBy: { name: string; phone?: string }
  createdAt: string
}

export interface CreateAnnouncementInput {
  title: string
  body: string
  category?: AnnouncementCategory
  images?: string[]
}

export async function listAnnouncements(
  societyId: string,
  category?: AnnouncementCategory,
): Promise<Announcement[]> {
  const params = category ? { category } : {}
  const res = await api.get(`/societies/${societyId}/announcements`, { params })
  return res.data.data.announcements
}

export async function getAnnouncement(societyId: string, announcementId: string): Promise<Announcement> {
  const res = await api.get(`/societies/${societyId}/announcements/${announcementId}`)
  return res.data.data
}

export async function createAnnouncement(
  societyId: string,
  data: CreateAnnouncementInput,
): Promise<Announcement> {
  const res = await api.post(`/societies/${societyId}/announcements`, data)
  return res.data.data
}

export async function pinAnnouncement(
  societyId: string,
  announcementId: string,
): Promise<{ isPinned: boolean }> {
  const res = await api.patch(`/societies/${societyId}/announcements/${announcementId}/pin`)
  return res.data.data
}

export async function deleteAnnouncement(societyId: string, announcementId: string): Promise<void> {
  await api.delete(`/societies/${societyId}/announcements/${announcementId}`)
}
