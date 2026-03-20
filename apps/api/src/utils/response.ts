import { Response } from 'express'

export const sendSuccess = (
  res: Response,
  data: unknown,
  statusCode = 200
): void => {
  res.status(statusCode).json({ data })
}

export const sendCreated = (res: Response, data: unknown): void => {
  res.status(201).json({ data })
}

export const sendError = (
  res: Response,
  error: string,
  statusCode = 400,
  details?: unknown
): void => {
  res.status(statusCode).json({
    error,
    ...(details && { details })
  })
}

export const sendUnauthorized = (
  res: Response,
  error = 'unauthorized'
): void => {
  res.status(401).json({ error })
}

export const sendForbidden = (
  res: Response,
  error = 'forbidden'
): void => {
  res.status(403).json({ error })
}

export const sendNotFound = (
  res: Response,
  error = 'not_found'
): void => {
  res.status(404).json({ error })
}

export const sendServerError = (
  res: Response,
  error = 'server_error'
): void => {
  res.status(500).json({ error })
}