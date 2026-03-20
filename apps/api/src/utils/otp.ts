import crypto from 'crypto'

export const generateOtp = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export const getOtpExpiry = (): Date => {
  const expiry = new Date()
  expiry.setMinutes(expiry.getMinutes() + 10)
  return expiry
}

export const isOtpExpired = (expiresAt: Date): boolean => {
  return new Date() > expiresAt
}

export const getInvitationExpiry = (): Date => {
  const expiry = new Date()
  expiry.setDate(expiry.getDate() + 7)
  return expiry
}