import { Request, Response, NextFunction } from 'express'

export interface AppError extends Error {
  statusCode?: number
  code?: string
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message)

  // Prisma errors
  if (err.code === 'P2002') {
    res.status(409).json({ error: 'already_exists' })
    return
  }

  if (err.code === 'P2025') {
    res.status(404).json({ error: 'not_found' })
    return
  }

  // Known app error
  if (err.statusCode) {
    res.status(err.statusCode).json({ error: err.message })
    return
  }

  // Unknown error — don't expose internals
  res.status(500).json({ error: 'server_error' })
}