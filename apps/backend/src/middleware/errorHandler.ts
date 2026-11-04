// errorHandler.ts — centralised Express error handler middleware
// PURPOSE
//   Catches all errors thrown by route handlers (including async errors via
//   express-async-errors) and returns a consistent JSON error shape.
//
// DESIGN CONSTRAINTS
//   Must be registered as the last middleware in index.ts.
//   Never leaks stack traces to the client in production.
import { Request, Response, NextFunction } from 'express'

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isDev = process.env.NODE_ENV === 'development'
  console.error('[error]', err.message, isDev ? err.stack : '')

  res.status(500).json({
    error: 'Internal server error',
    ...(isDev && { message: err.message }),
  })
}
