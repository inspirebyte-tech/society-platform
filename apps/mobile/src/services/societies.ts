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
