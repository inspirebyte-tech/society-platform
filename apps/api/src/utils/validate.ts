export interface ValidationResult {
  valid: boolean
  error?: string
  field?: string
}

export const validatePhone = (phone: string): ValidationResult => {
  if (!phone) {
    return { valid: false, error: 'missing_field', field: 'phone' }
  }

  const cleaned = phone.replace(/\s+/g, '')

  // accepts +91XXXXXXXXXX or 10 digit number
  const phoneRegex = /^(\+91)?[6-9]\d{9}$/
  if (!phoneRegex.test(cleaned)) {
    return { valid: false, error: 'invalid_phone_format', field: 'phone' }
  }

  return { valid: true }
}

export const validateOtp = (otp: string): ValidationResult => {
  if (!otp) {
    return { valid: false, error: 'missing_field', field: 'otp' }
  }

  if (!/^\d{6}$/.test(otp)) {
    return { valid: false, error: 'invalid_otp_format', field: 'otp' }
  }

  return { valid: true }
}

export const validateRequired = (
  fields: Record<string, unknown>,
  required: string[]
): ValidationResult => {
  for (const field of required) {
    if (!fields[field]) {
      return { valid: false, error: 'missing_field', field }
    }
  }
  return { valid: true }
}

export const normalizePhone = (phone: string): string => {
  const cleaned = phone.replace(/\s+/g, '')
  if (cleaned.startsWith('+91')) return cleaned
  return `+91${cleaned}`
}