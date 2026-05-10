import api from './api'

export type VisitorType = 'INDIVIDUAL' | 'DELIVERY' | 'SERVICE' | 'DOMESTIC' | 'CAB' | 'OTHER'

export type EntryStatus = 'PENDING' | 'APPROVED' | 'DENIED' | 'ALLOWED' | 'TURNED_AWAY' | 'EXITED'

export interface Visitor {
  id: string
  name: string
  mobile?: string
  type: VisitorType
  photoUrl?: string
  isFrequent: boolean
  frequentForUnitId?: string
  frequentFlatName?: string
}

export interface VisitorEntry {
  id: string
  visitorId: string
  visitorName: string
  visitorType: VisitorType
  visitorPhoto?: string
  flatName?: string
  purpose?: string
  status: EntryStatus
  loggedByName?: string
  notifiedAt?: string
  respondedAt?: string
  enteredAt?: string
  exitedAt?: string
  createdAt: string
}

export interface PreApproval {
  id: string
  visitorName: string
  visitorMobile?: string
  unitId: string
  flatName: string
  note?: string
  isUsed: boolean
  usedAt?: string
  expiresAt?: string
  createdAt: string
}

export async function searchVisitors(
  societyId: string,
  query: { name?: string; mobile?: string }
): Promise<{ visitors: Visitor[]; preApprovals: PreApproval[] }> {
  const res = await api.post(`/societies/${societyId}/visitors/search`, query)
  return res.data.data
}

export async function createVisitor(
  societyId: string,
  data: { name: string; mobile?: string; type: VisitorType; vehicleNo?: string; photoUrl?: string }
): Promise<Visitor> {
  const res = await api.post(`/societies/${societyId}/visitors`, data)
  return res.data.data
}

export async function logEntry(
  societyId: string,
  visitorId: string,
  data: { unitId?: string; purpose?: string; vehicleNo?: string; photoUrl?: string; preApprovalId?: string }
): Promise<VisitorEntry> {
  const res = await api.post(`/societies/${societyId}/visitors/${visitorId}/entries`, data)
  return res.data.data
}

export async function approveEntry(societyId: string, entryId: string): Promise<VisitorEntry> {
  const res = await api.patch(`/societies/${societyId}/entries/${entryId}/approve`)
  return res.data.data
}

export async function rejectEntry(societyId: string, entryId: string): Promise<VisitorEntry> {
  const res = await api.patch(`/societies/${societyId}/entries/${entryId}/reject`)
  return res.data.data
}

export async function allowEntry(societyId: string, entryId: string): Promise<VisitorEntry> {
  const res = await api.patch(`/societies/${societyId}/entries/${entryId}/allow`)
  return res.data.data
}

export async function turnAwayEntry(societyId: string, entryId: string): Promise<VisitorEntry> {
  const res = await api.patch(`/societies/${societyId}/entries/${entryId}/turnaway`)
  return res.data.data
}

export async function markEntered(societyId: string, entryId: string): Promise<{ enteredAt: string }> {
  const res = await api.patch(`/societies/${societyId}/entries/${entryId}/enter`)
  return res.data.data
}

export async function markExited(societyId: string, entryId: string): Promise<{ exitedAt: string }> {
  const res = await api.patch(`/societies/${societyId}/entries/${entryId}/exit`)
  return res.data.data
}

export async function getActiveVisitors(societyId: string): Promise<VisitorEntry[]> {
  const res = await api.get(`/societies/${societyId}/entries/active`)
  return res.data.data.entries
}

export async function getEntryLog(
  societyId: string,
  filters?: { status?: string; unitId?: string; date?: string; type?: string }
): Promise<VisitorEntry[]> {
  const res = await api.get(`/societies/${societyId}/entries`, { params: filters })
  return res.data.data.entries
}

export async function createPreApproval(
  societyId: string,
  data: { visitorName: string; visitorMobile?: string; unitId: string; note?: string; expiresAt?: string }
): Promise<PreApproval> {
  const res = await api.post(`/societies/${societyId}/pre-approvals`, data)
  return res.data.data
}

export async function getPreApprovals(societyId: string): Promise<PreApproval[]> {
  const res = await api.get(`/societies/${societyId}/pre-approvals`)
  return res.data.data.preApprovals
}

export async function deletePreApproval(societyId: string, approvalId: string): Promise<void> {
  await api.delete(`/societies/${societyId}/pre-approvals/${approvalId}`)
}

export async function markFrequent(societyId: string, visitorId: string, unitId: string): Promise<void> {
  await api.post(`/societies/${societyId}/visitors/${visitorId}/frequent`, { unitId })
}

export async function removeFrequent(societyId: string, visitorId: string): Promise<void> {
  await api.delete(`/societies/${societyId}/visitors/${visitorId}/frequent`)
}
