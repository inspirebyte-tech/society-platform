import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding...')

  // ─────────────────────────────────────────────
  // 1. Permissions
  // ─────────────────────────────────────────────
  const permissions = [
    // Society
    { name: 'society.create', module: 'society', description: 'Create a society' },
    { name: 'society.update', module: 'society', description: 'Update society details' },
    { name: 'society.view',   module: 'society', description: 'View society details' },

    // Structure (nodes)
    { name: 'node.create', module: 'nodes', description: 'Add towers, wings, units to society' },
    { name: 'node.update', module: 'nodes', description: 'Edit node details' },
    { name: 'node.delete', module: 'nodes', description: 'Remove nodes from society' },
    { name: 'node.view',   module: 'nodes', description: 'View society structure' },

    // Members
    { name: 'member.view',   module: 'members', description: 'View society members' },
    { name: 'member.remove', module: 'members', description: 'Remove a member from society' },
    { name: 'member.reactivate', module: 'members', description: 'Reactivate a deactivated member' },

    // Invitations
    { name: 'invitation.create', module: 'invitations', description: 'Invite someone to society' },
    { name: 'invitation.cancel', module: 'invitations', description: 'Cancel a pending invitation' },
    { name: 'invitation.view',   module: 'invitations', description: 'View pending invitations' },

    // Ownership
    { name: 'ownership.assign', module: 'property', description: 'Assign unit ownership' },
    { name: 'ownership.remove', module: 'property', description: 'Remove unit ownership' },
    { name: 'ownership.view',   module: 'property', description: 'View ownership records' },

    // Occupancy
    { name: 'occupancy.assign', module: 'property', description: 'Assign unit occupancy' },
    { name: 'occupancy.remove', module: 'property', description: 'Remove unit occupancy' },
    { name: 'occupancy.view',   module: 'property', description: 'View occupancy records' },

    // Announcements
    { name: 'announcement.create', module: 'announcements', description: 'Create announcements' },
    { name: 'announcement.view',   module: 'announcements', description: 'View announcements' },

    // Visitors
    { name: 'visitor.log',             module: 'visitors', description: 'Log a visitor at gate' },
    { name: 'visitor.approve',         module: 'visitors', description: 'Approve or deny a visitor' },
    { name: 'visitor.view_own',        module: 'visitors', description: 'View own visitor history' },
    { name: 'visitor.view_live',       module: 'visitors', description: 'View live gate log' },
    { name: 'visitor.view_emergency',  module: 'visitors', description: 'Emergency full visitor access' },

    // Services
    { name: 'service.create',          module: 'services', description: 'Add to society services directory' },
    { name: 'service.view',            module: 'services', description: 'View services directory' },
    { name: 'service.manage_personal', module: 'services', description: 'Manage personal staff list' },

    // Polls
    { name: 'poll.create', module: 'polls', description: 'Create a poll' },
    { name: 'poll.vote',   module: 'polls', description: 'Vote on a poll' },
    { name: 'poll.view',   module: 'polls', description: 'View polls and results' },

    // Emergency
    { name: 'emergency.declare', module: 'emergency', description: 'Declare an emergency' },
    { name: 'emergency.view',    module: 'emergency', description: 'View emergencies' },

    // Assets
    { name: 'asset.create',          module: 'assets', description: 'Define a bookable asset' },
    { name: 'asset.book',            module: 'assets', description: 'Book an asset' },
    { name: 'asset.view',            module: 'assets', description: 'View available assets' },
    { name: 'asset.manage_booking',  module: 'assets', description: 'Approve or reject bookings' },

    // Roles
    { name: 'role.create', module: 'roles', description: 'Create custom roles' },
    { name: 'role.assign',  module: 'roles', description: 'Assign roles to members' },
    { name: 'role.view',    module: 'roles', description: 'View roles and permissions' },

    // Co-resident
    { name: 'co_resident.invite', module: 'co_resident', description: 'Invite a co-resident to your flat' },

    // Complaint
    { name: 'complaint.create',      module: 'complaints', description: 'Raise a complaint' },
    { name: 'complaint.view_own',    module: 'complaints', description: 'View own complaints' },
    { name: 'complaint.view_all',    module: 'complaints', description: 'View all complaints in society' },
    { name: 'complaint.resolve_own', module: 'complaints', description: 'Resolve own complaint' },
    { name: 'complaint.resolve_any', module: 'complaints', description: 'Resolve any complaint' },
    { name: 'complaint.reject',      module: 'complaints', description: 'Reject a complaint with reason' },

  ]

  for (const p of permissions) {
    await prisma.permission.upsert({
      where: { name: p.name },
      update: { description: p.description },
      create: p
    })
  }

  // ─────────────────────────────────────────────
  // 2. Roles and permission bundles
  // ─────────────────────────────────────────────
  const roleBundles: Record<string, string[]> = {
    Builder: [
      'society.create', 'society.update', 'society.view',
      'node.create', 'node.update', 'node.delete', 'node.view',
      'member.view', 'member.remove', 'member.reactivate',
      'invitation.create', 'invitation.cancel', 'invitation.view',
      'ownership.assign', 'ownership.remove', 'ownership.view',
      'occupancy.assign', 'occupancy.remove', 'occupancy.view',
      'complaint.view_all', 'complaint.resolve_any', 'complaint.reject',
      'announcement.create', 'announcement.view',
      'visitor.view_live', 'visitor.view_emergency',
      'emergency.declare', 'emergency.view',
      'role.create', 'role.assign', 'role.view'
    ],

    Admin: [
      'society.update', 'society.view',
      'node.update', 'node.view',
      'member.view', 'member.remove',
      'invitation.create', 'invitation.cancel', 'invitation.view',
      'ownership.assign', 'ownership.remove', 'ownership.view',
      'occupancy.assign', 'occupancy.remove', 'occupancy.view',
      'announcement.create', 'announcement.view',
      'visitor.view_live', 'visitor.view_emergency',
      'service.create', 'service.view',
      'poll.create', 'poll.vote', 'poll.view',
      'emergency.declare', 'emergency.view',
      'asset.create', 'asset.book', 'asset.view', 'asset.manage_booking',
      'role.create', 'role.assign', 'role.view',
      'complaint.view_all', 'complaint.resolve_any', 'complaint.reject'
    ],

    Resident: [
      'society.view',
      'complaint.create', 'complaint.view_own', 'complaint.resolve_own',
      'announcement.view',
      'visitor.approve', 'visitor.view_own',
      'service.view', 'service.manage_personal',
      'poll.vote', 'poll.view',
      'emergency.declare', 'emergency.view',
      'asset.book', 'asset.view',
      'co_resident.invite'
    ],

    'Co-resident': [
      'society.view',
      'complaint.create', 'complaint.view_own', 'complaint.resolve_own',
      'announcement.view',
      'visitor.approve', 'visitor.view_own',
      'service.view',
      'poll.vote', 'poll.view',
      'emergency.declare', 'emergency.view',
      'asset.book', 'asset.view'
    ],

    Gatekeeper: [
      'visitor.log', 'visitor.view_live',
      'emergency.declare', 'emergency.view'
    ]
  }

  const roleIds: Record<string, string> = {
    'Builder': 'role-builder',
    'Admin': 'role-admin',
    'Resident': 'role-resident',
    'Co-resident': 'role-co-resident',
    'Gatekeeper': 'role-gatekeeper'
  }

  for (const [roleName, perms] of Object.entries(roleBundles)) {
    const roleId = roleIds[roleName]

    const role = await prisma.role.upsert({
      where: { id: roleId },
      update: { name: roleName },
      create: {
        id: roleId,
        name: roleName,
        isSystemRole: true,
        orgId: null
      }
    })

    // clear existing permissions first — clean slate
    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id }
    })

    for (const permName of perms) {
      const permission = await prisma.permission.findUnique({
        where: { name: permName }
      })
      if (permission) {
        await prisma.rolePermission.create({
          data: {
            roleId: role.id,
            permissionId: permission.id
          }
        })
      } else {
        console.warn(`Permission not found: ${permName}`)
      }
    }
  }

  // ─────────────────────────────────────────────
  // 3. Test society
  // ─────────────────────────────────────────────
  const org = await prisma.organization.create({
    data: {
      name: 'Green Valley Society',
      address: '123 Test Road',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
      type: 'APARTMENT'
    }
  })

  // ─────────────────────────────────────────────
  // 4. Property structure
  // ─────────────────────────────────────────────
  const societyNode = await prisma.propertyNode.create({
    data: {
      orgId: org.id,
      nodeType: 'SOCIETY',
      name: 'Green Valley',
      code: 'GV',
      parentId: null
    }
  })

  const towerA = await prisma.propertyNode.create({
    data: {
      orgId: org.id,
      nodeType: 'TOWER',
      name: 'Tower A',
      code: 'TA',
      parentId: societyNode.id
    }
  })

  const unit4B = await prisma.propertyNode.create({
    data: {
      orgId: org.id,
      nodeType: 'UNIT',
      name: 'Flat 4B',
      code: '4B',
      parentId: towerA.id,
      metadata: { bhk: '2BHK', sqFt: 950, floorNo: 4 }
    }
  })

  // ─────────────────────────────────────────────
  // 5. Test users
  // ─────────────────────────────────────────────
  const builderUser = await prisma.user.create({
    data: {
      phone: '+919111111111',
      phoneVerified: true,
      person: {
        create: {
          fullName: 'Vikram Builder',
          phone: '+919111111111'
        }
      }
    }
  })

  const residentUser = await prisma.user.create({
    data: {
      phone: '+919222222222',
      phoneVerified: true,
      person: {
        create: {
          fullName: 'Arjun Mehta',
          phone: '+919222222222'
        }
      }
    }
  })

  const gatekeeperUser = await prisma.user.create({
    data: {
      phone: '+919333333333',
      phoneVerified: true,
      person: {
        create: {
          fullName: 'Ramesh Gate',
          phone: '+919333333333'
        }
      }
    }
  })

  const coResidentUser = await prisma.user.create({
    data: {
      phone: '+919444444444',
      phoneVerified: true,
      person: {
        create: {
          fullName: 'Meera Mehta',
          phone: '+919444444444'
        }
      }
    }
  })

  // ─────────────────────────────────────────────
  // 6. Memberships
  // ─────────────────────────────────────────────
  await prisma.membership.create({
    data: {
      userId: builderUser.id,
      orgId: org.id,
      roleId: 'role-builder'
    }
  })

  await prisma.membership.create({
    data: {
      userId: residentUser.id,
      orgId: org.id,
      roleId: 'role-resident'
    }
  })

  await prisma.membership.create({
    data: {
      userId: gatekeeperUser.id,
      orgId: org.id,
      roleId: 'role-gatekeeper'
    }
  })

  await prisma.membership.create({
    data: {
      userId: coResidentUser.id,
      orgId: org.id,
      roleId: 'role-co-resident'
    }
  })

  // ─────────────────────────────────────────────
  // 7. Ownership and occupancy for Arjun
  // ─────────────────────────────────────────────
  const arjunPerson = await prisma.person.findFirst({
    where: { userId: residentUser.id }
  })

  if (arjunPerson) {
    await prisma.unitOwnership.create({
      data: {
        unitId: unit4B.id,
        personId: arjunPerson.id,
        ownedFrom: new Date('2022-01-01'),
        ownershipType: 'SOLE'
      }
    })

    await prisma.unitOccupancy.create({
      data: {
        unitId: unit4B.id,
        personId: arjunPerson.id,
        occupiedFrom: new Date('2022-01-01'),
        occupancyType: 'OWNER_RESIDENT',
        isPrimary: true
      }
    })
  }

  // ─────────────────────────────────────────────
  // 8. Occupancy for Meera (co-resident in same flat)
  // ─────────────────────────────────────────────
  const meeraPerson = await prisma.person.findFirst({
    where: { userId: coResidentUser.id }
  })

  if (meeraPerson) {
    await prisma.unitOccupancy.create({
      data: {
        unitId: unit4B.id,
        personId: meeraPerson.id,
        occupiedFrom: new Date('2022-01-01'),
        occupancyType: 'FAMILY_MEMBER',
        isPrimary: false
      }
    })
  }

  console.log('Seed complete.')
  console.log('Test phones:')
  console.log('  Builder:      +919111111111')
  console.log('  Resident:     +919222222222')
  console.log('  Gatekeeper:   +919333333333')
  console.log('  Co-resident:  +919444444444')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())