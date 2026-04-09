/** Accepts 10-digit number or +91 prefixed */
export function isValidIndianPhone(phone: string): boolean {
  const cleaned = phone.replace(/\s/g, '')
  if (cleaned.startsWith('+91')) {
    return /^\+91[6-9]\d{9}$/.test(cleaned)
  }
  return /^[6-9]\d{9}$/.test(cleaned)
}

/** Format phone as user types: inserts space after 5 digits */
export function formatPhoneDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10)
  if (digits.length > 5) {
    return digits.slice(0, 5) + ' ' + digits.slice(5)
  }
  return digits
}

/** Strip formatting and return bare 10-digit number */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10)
}
