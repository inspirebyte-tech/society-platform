import api from './api'

export type NodeType =
  | 'SOCIETY'
  | 'TOWER'
  | 'WING'
  | 'FLOOR'
  | 'UNIT'
  | 'COMMON_AREA'
  | 'PHASE'
  | 'BUILDING'
  | 'VILLA'
  | 'PLOT'
  | 'BASEMENT'

export interface AddNodePayload {
  parentId: string
  nodeType: NodeType
  name: string
  code: string
  metadata?: {
    bhk?: string
    sqFt?: number
    floorNo?: number
  }
}

export interface BulkAddNodePayload {
  parentId: string
  nodeType: NodeType
  count: number
  startNumber: number
  prefix?: string
  metadata?: Record<string, unknown>
}

export async function getNodes(societyId: string) {
  const res = await api.get(`/societies/${societyId}/nodes`)
  return res.data.data
}

export async function addNode(societyId: string, payload: AddNodePayload) {
  const res = await api.post(`/societies/${societyId}/nodes`, payload)
  return res.data.data
}

export async function bulkAddNodes(societyId: string, payload: BulkAddNodePayload) {
  const res = await api.post(`/societies/${societyId}/nodes/bulk`, payload)
  return res.data.data
}

export async function updateNode(
  societyId: string,
  nodeId: string,
  payload: { name?: string; code?: string; metadata?: Record<string, unknown> },
) {
  const res = await api.patch(`/societies/${societyId}/nodes/${nodeId}`, payload)
  return res.data.data
}

export async function deleteNode(societyId: string, nodeId: string) {
  const res = await api.delete(`/societies/${societyId}/nodes/${nodeId}`)
  return res.data.data
}
