import api from './api'

export async function listMembers(
  societyId: string,
  params?: { status?: 'active' | 'inactive' | 'all'; role?: string },
) {
  const res = await api.get(`/societies/${societyId}/members`, { params })
  return res.data.data
}

export async function getMember(societyId: string, memberId: string) {
  const res = await api.get(`/societies/${societyId}/members/${memberId}`)
  return res.data.data
}

export async function deactivateMember(societyId: string, memberId: string) {
  const res = await api.patch(`/societies/${societyId}/members/${memberId}/deactivate`)
  return res.data.data
}

export async function moveOutMember(societyId: string, memberId: string) {
  const res = await api.patch(`/societies/${societyId}/members/${memberId}/moveout`)
  return res.data.data
}

export async function reactivateMember(societyId: string, memberId: string) {
  const res = await api.patch(`/societies/${societyId}/members/${memberId}/reactivate`)
  return res.data.data
}

export interface DirectAddMemberParams {
  phone: string
  name: string
  role: string
  unitId?: string
  occupancyType?: string
}

export async function directAddMember(
  societyId: string,
  params: DirectAddMemberParams,
): Promise<{ memberId: string; message: string }> {
  const res = await api.post(`/societies/${societyId}/members/direct-add`, params)
  return res.data.data
}
