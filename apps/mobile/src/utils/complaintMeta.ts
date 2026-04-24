import { ComplaintCategory, ComplaintStatus } from '../services/complaints'
import { Ionicons } from '@expo/vector-icons'

export const CATEGORY_LABEL: Record<ComplaintCategory, string> = {
  WATER_SUPPLY: 'Water Supply',
  ELECTRICITY: 'Electricity',
  LIFT_ELEVATOR: 'Lift / Elevator',
  GENERATOR: 'Generator',
  INTERNET_CABLE: 'Internet & Cable',
  PARKING: 'Parking',
  GARBAGE_WASTE: 'Garbage & Waste',
  GARDEN_LANDSCAPING: 'Garden & Landscaping',
  GYM_CLUBHOUSE: 'Gym / Clubhouse',
  SWIMMING_POOL: 'Swimming Pool',
  SECURITY: 'Security',
  NOISE: 'Noise',
  PET_RELATED: 'Pet Related',
  DOMESTIC_HELP: 'Domestic Help',
  NEIGHBOUR_BEHAVIOUR: 'Neighbour Behaviour',
  STAFF_BEHAVIOUR: 'Staff Behaviour',
  MAINTENANCE_REPAIR: 'Maintenance & Repair',
  RULE_VIOLATION: 'Rule Violation',
  OTHER: 'Other',
}

export const CATEGORY_ICON: Record<
  ComplaintCategory,
  keyof typeof Ionicons.glyphMap
> = {
  WATER_SUPPLY: 'water-outline',
  ELECTRICITY: 'flash-outline',
  LIFT_ELEVATOR: 'arrow-up-circle-outline',
  GENERATOR: 'battery-charging-outline',
  INTERNET_CABLE: 'wifi-outline',
  PARKING: 'car-outline',
  GARBAGE_WASTE: 'trash-outline',
  GARDEN_LANDSCAPING: 'leaf-outline',
  GYM_CLUBHOUSE: 'barbell-outline',
  SWIMMING_POOL: 'water-outline',
  SECURITY: 'shield-checkmark-outline',
  NOISE: 'volume-high-outline',
  PET_RELATED: 'paw-outline',
  DOMESTIC_HELP: 'home-outline',
  NEIGHBOUR_BEHAVIOUR: 'people-outline',
  STAFF_BEHAVIOUR: 'person-outline',
  MAINTENANCE_REPAIR: 'construct-outline',
  RULE_VIOLATION: 'warning-outline',
  OTHER: 'document-text-outline',
}

export const STATUS_LABEL: Record<ComplaintStatus, string> = {
  OPEN: 'Open',
  RESOLVED: 'Resolved',
  REJECTED: 'Rejected',
}

export const STATUS_COLORS: Record<ComplaintStatus, { bg: string; text: string }> = {
  OPEN: { bg: '#fef3c7', text: '#92400e' },
  RESOLVED: { bg: '#dcfce7', text: '#166534' },
  REJECTED: { bg: '#fee2e2', text: '#991b1b' },
}

export const ALL_CATEGORIES: ComplaintCategory[] = [
  'WATER_SUPPLY',
  'ELECTRICITY',
  'LIFT_ELEVATOR',
  'GENERATOR',
  'INTERNET_CABLE',
  'PARKING',
  'GARBAGE_WASTE',
  'GARDEN_LANDSCAPING',
  'GYM_CLUBHOUSE',
  'SWIMMING_POOL',
  'SECURITY',
  'NOISE',
  'PET_RELATED',
  'DOMESTIC_HELP',
  'NEIGHBOUR_BEHAVIOUR',
  'STAFF_BEHAVIOUR',
  'MAINTENANCE_REPAIR',
  'RULE_VIOLATION',
  'OTHER',
]
