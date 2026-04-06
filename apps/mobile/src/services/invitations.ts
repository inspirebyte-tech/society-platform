import api from './api'

export async function createInvitation(societyId: string, phone: string, roleId: string) {
  const res = await api.post(`/societies/${societyId}/invitations`, { phone, roleId })
  return res.data.data
}

export async function listInvitations(societyId: string) {
  const res = await api.get(`/societies/${societyId}/invitations`)
  return res.data.data
}

export async function cancelInvitation(societyId: string, invitationId: string) {
  const res = await api.delete(`/societies/${societyId}/invitations/${invitationId}`)
  return res.data.data
}
