import jwt from 'jsonwebtoken'

function requireSecret(name: string): string {
  const val = process.env[name]
  if (!val || val.length < 32) {
    throw new Error(`${name} must be set and at least 32 characters long`)
  }
  return val
}

const JWT_SECRET = requireSecret('JWT_SECRET')
const JWT_REFRESH_SECRET = requireSecret('JWT_REFRESH_SECRET')

export interface TokenPayload {
  userId: string
  orgId?: string
  type: 'session' | 'auth'
  tokenVersion: number
}

export interface RefreshTokenPayload {
  userId: string
  type: 'refresh'
  tokenVersion: number
}

export const generateToken = (
  payload: Omit<TokenPayload, 'type'> & { type?: 'session' | 'auth' },
  expiresIn = '7d'
): string => {
  return jwt.sign(
    { ...payload, type: payload.orgId ? 'session' : 'auth' },
    JWT_SECRET,
    { expiresIn: expiresIn as any }
  )
}

export const generateRefreshToken = (
  userId: string,
  tokenVersion: number
): string => {
  return jwt.sign(
    { userId, type: 'refresh', tokenVersion  },
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