import api from './api'

export type SocietyType = 'APARTMENT' | 'VILLA' | 'MIXED' | 'PLOTTED'

export interface CreateSocietyPayload {
  name: string
  address: string
  city: string
  state: string
  pincode: string
  type: SocietyType
}

export interface SocietySettings {
  contactPhone?: string
  contactEmail?: string
  description?: string
}

export async function createSociety(payload: CreateSocietyPayload) {
  const res = await api.post('/societies', payload)
  return res.data.data
}

export async function listSocieties() {
  const res = await api.get('/societies')
  return res.data.data
}

export async function getSociety(id: string) {
  const res = await api.get(`/societies/${id}`)
  return res.data.data
}

export async function updateSociety(id: string, payload: Partial<CreateSocietyPayload>) {
  const res = await api.patch(`/societies/${id}`, payload)
  return res.data.data
}

export async function updateSocietyPhoto(id: string, photoUrl: string): Promise<void> {
  await api.patch(`/societies/${id}`, { photoUrl })
}

export async function updateSocietySettings(id: string, settings: SocietySettings): Promise<void> {
  await api.patch(`/societies/${id}/settings`, settings)
}

export async function leaveSociety(societyId: string): Promise<{ message: string }> {
  const res = await api.patch(`/societies/${societyId}/leave`)
  return res.data.data
}
