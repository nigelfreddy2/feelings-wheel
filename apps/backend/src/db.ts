// db.ts — Prisma client singleton
// PURPOSE
//   Exports a single shared PrismaClient instance for use across all services.
//   Using a singleton prevents connection pool exhaustion during hot-reload in dev.
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  })

// In dev, attach to globalThis so ts-node-dev hot reloads don't create new connections
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
