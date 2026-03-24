import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret'

export interface TokenPayload {
  userId: string
  orgId?: string
  type: 'session' | 'auth'
}

export interface RefreshTokenPayload {
  userId: string
  type: 'refresh'
}

export const generateToken = (
  payload: Omit<TokenPayload, 'type'> & { type?: 'session' | 'auth' },
  expiresIn = '7d'
): string => {
  return jwt.sign(
    { ...payload, type: payload.orgId ? 'session' : 'auth' },
    JWT_SECRET,
    { expiresIn }
  )
}

export const generateRefreshToken = (userId: string): string => {
  return jwt.sign(
    { userId, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: '30d' }
  )
}

export const verifyToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload
  } catch {
    return null
  }
}

export const verifyRefreshToken = (
  token: string
): RefreshTokenPayload | null => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as RefreshTokenPayload
  } catch {
    return null
  }
}