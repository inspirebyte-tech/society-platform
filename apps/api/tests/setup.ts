import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.test' })

import { prisma } from '../src/lib/prisma'
import { generateToken } from '../src/utils/jwt'

// No beforeAll here — DB reset handled by globalSetup.ts

afterAll(async () => {
  await prisma.$disconnect()
})

export const getTokens = async () => {
  const users = await prisma.user.findMany({
    include: {
      person: true,
      memberships: {
        include: { role: true }
      }
    }
  })

  const tokens: Record<string, string> = {}
  for (const user of users) {
    const roleName = user.memberships[0]?.role.name
    if (roleName) {
      tokens[roleName] = generateToken({
        userId:       user.id,
        orgId:        user.memberships[0]?.orgId,
        tokenVersion: user.tokenVersion
      })
    }
  }
  return tokens
}

export const getSocietyId = async () => {
  const builder = await prisma.user.findFirst({
    where: { phone: '+919111111111' },
    include: {
      memberships: {
        where: { isActive: true }
      }
    }
  })
  return builder!.memberships[0].orgId
}

export const getMembershipId = async (
  orgId: string,
  roleName: string
) => {
  const membership = await prisma.membership.findFirst({
    where: {
      orgId,
      role: { name: roleName },
      isActive: true
    }
  })
  return membership!.id
}