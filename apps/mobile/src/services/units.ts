import api from './api'

// ─── Enums ────────────────────────────────────────────────────────────────────

export type OwnershipType = 'PRIMARY_OWNER' | 'CO_OWNER'
export type OccupancyType = 'OWNER_RESIDENT' | 'TENANT' | 'FAMILY' | 'CARETAKER'

// ─── List Units (inventory) ───────────────────────────────────────────────────

export interface UnitListItem {
  id: string
  name: string
  code: string | null
  path: string | null
  metadata: Record<string, unknown> | null
  isVacant: boolean
  primaryOwner: string | null
  primaryOccupant: string | null
  occupancyType: OccupancyType | null
}

export interface ListUnitsResponse {
  units: UnitListItem[]
  total: number
  occupied: number
  vacant: number
}

export type UnitStatusFilter = 'vacant' | 'occupied'

export async function listUnits(
  societyId: string,
  params?: { status?: UnitStatusFilter },
): Promise<ListUnitsResponse> {
  const res = await api.get(`/societies/${societyId}/units`, { params })
  return res.data.data
}

// ─── Unit Detail ──────────────────────────────────────────────────────────────

export interface UnitOwner {
  id: string
  name: string
  phone: string
  ownershipType: OwnershipType
  isPrimary: boolean
  ownedFrom: string
}

export interface UnitOccupant {
  id: string
  name: string
  phone: string
  occupancyType: OccupancyType
  isPrimary: boolean
  occupiedFrom: string
}

export interface UnitHistoryEntry {
  name: string
  occupancyType: OccupancyType
  occupiedFrom: string
  occupiedUntil: string
}

export interface UnitDetail {
  id: string
  name: string
  code: string | null
  path: string | null
  floor: number | null
  bhk: number | null
  area: number | null
  isVacant: boolean
  owners: UnitOwner[]
  currentOccupants: UnitOccupant[]
  occupancyHistory: UnitHistoryEntry[]
}

export async function getUnit(societyId: string, nodeId: string): Promise<UnitDetail> {
  const res = await api.get(`/societies/${societyId}/units/${nodeId}`)
  return res.data.data
}

// ─── Ownership ────────────────────────────────────────────────────────────────

export interface AssignOwnershipInput {
  userId: string
  ownershipType: OwnershipType
  isPrimary?: boolean
}

export async function assignOwnership(
  societyId: string,
  nodeId: string,
  data: AssignOwnershipInput,
) {
  const res = await api.post(`/societies/${societyId}/units/${nodeId}/ownership`, data)
  return res.data.data
}

export async function endOwnership(
  societyId: string,
  nodeId: string,
  ownershipId: string,
) {
  const res = await api.delete(
    `/societies/${societyId}/units/${nodeId}/ownership/${ownershipId}`,
  )
  return res.data.data
}

// ─── Occupancy ────────────────────────────────────────────────────────────────

export interface AssignOccupancyInput {
  userId: string
  occupancyType: OccupancyType
  isPrimary?: boolean
}

export async function assignOccupancy(
  societyId: string,
  nodeId: string,
  data: AssignOccupancyInput,
) {
  const res = await api.post(`/societies/${societyId}/units/${nodeId}/occupancy`, data)
  return res.data.data
}

export async function endOccupancy(
  societyId: string,
  nodeId: string,
  occupancyId: string,
) {
  const res = await api.delete(
    `/societies/${societyId}/units/${nodeId}/occupancy/${occupancyId}`,
  )
  return res.data.data
}

// ─── My Home (member units) ───────────────────────────────────────────────────

export interface MemberOwnership {
  flatId: string
  flatName: string
  path: string | null
  ownershipType: OwnershipType
  isPrimary: boolean
  ownedFrom: string
  coOwners: { name: string; ownershipType: OwnershipType }[]
}

export interface MemberOccupancy {
  flatId: string
  flatName: string
  path: string | null
  occupancyType: OccupancyType
  isPrimary: boolean
  occupiedFrom: string
  coOccupants: { name: string; occupancyType: OccupancyType }[]
}

export interface MemberUnitsResponse {
  ownerships: MemberOwnership[]
  occupancies: MemberOccupancy[]
}

export async function getMemberUnits(
  societyId: string,
  memberId: string,
): Promise<MemberUnitsResponse> {
  const res = await api.get(`/societies/${societyId}/members/${memberId}/units`)
  return res.data.data
}
