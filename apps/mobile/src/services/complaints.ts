import api from './api'

export type ComplaintStatus = 'OPEN' | 'RESOLVED' | 'REJECTED'

export type ComplaintCategory =
  | 'WATER_SUPPLY'
  | 'ELECTRICITY'
  | 'LIFT_ELEVATOR'
  | 'GENERATOR'
  | 'INTERNET_CABLE'
  | 'PARKING'
  | 'GARBAGE_WASTE'
  | 'GARDEN_LANDSCAPING'
  | 'GYM_CLUBHOUSE'
  | 'SWIMMING_POOL'
  | 'SECURITY'
  | 'NOISE'
  | 'PET_RELATED'
  | 'DOMESTIC_HELP'
  | 'NEIGHBOUR_BEHAVIOUR'
  | 'STAFF_BEHAVIOUR'
  | 'MAINTENANCE_REPAIR'
  | 'RULE_VIOLATION'
  | 'OTHER'

export type ComplaintVisibility = 'PUBLIC' | 'PRIVATE'

export interface ComplaintListItem {
  id: string
  title: string
  category: ComplaintCategory
  visibility: ComplaintVisibility
  status: ComplaintStatus
  raisedBy: string | null
  raisedByMe: boolean
  imageCount: number
  createdAt: string
}

export interface ComplaintDetail {
  id: string
  title: string
  description: string
  category: ComplaintCategory
  visibility: ComplaintVisibility
  status: ComplaintStatus
  rejectionReason: string | null
  raisedBy: { name: string; phone: string } | null
  resolvedBy: string | null
  resolvedAt: string | null
  images: { id: string; imageUrl: string }[]
  createdAt: string
  updatedAt: string
}

export interface ListComplaintsParams {
  status?: ComplaintStatus
  category?: ComplaintCategory
  page?: number
  limit?: number
}

export interface ListComplaintsResponse {
  complaints: ComplaintListItem[]
  total: number
  page: number
  pages: number
}

export async function listComplaints(
  societyId: string,
  params: ListComplaintsParams = {},
): Promise<ListComplaintsResponse> {
  const res = await api.get(`/societies/${societyId}/complaints`, { params })
  return res.data.data
}

export async function getComplaint(societyId: string, complaintId: string): Promise<ComplaintDetail> {
  const res = await api.get(`/societies/${societyId}/complaints/${complaintId}`)
  return res.data.data
}

export interface RaiseComplaintInput {
  title: string
  description: string
  category: ComplaintCategory
  visibility: ComplaintVisibility
  images?: string[]
}

export async function raiseComplaint(societyId: string, data: RaiseComplaintInput) {
  const res = await api.post(`/societies/${societyId}/complaints`, data)
  return res.data.data
}

export async function updateComplaintStatus(
  societyId: string,
  complaintId: string,
  status: 'RESOLVED' | 'REJECTED',
  rejectionReason?: string,
) {
  const body: { status: string; rejectionReason?: string } = { status }
  if (rejectionReason) body.rejectionReason = rejectionReason
  const res = await api.patch(`/societies/${societyId}/complaints/${complaintId}`, body)
  return res.data.data
}
