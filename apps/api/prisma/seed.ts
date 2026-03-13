import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Seeding...')

    // 1. Create permissions
    const permissions = [
        { name: 'org.create', module: 'org', description: 'Create organizations' },
        { name: 'unit.create', module: 'units', description: 'Create units' },
        { name: 'unit.update', module: 'units', description: 'Update units' },
        { name: 'unit.view', module: 'units', description: 'View units' },
        { name: 'member.invite', module: 'members', description: 'Invite members' },
        { name: 'member.remove', module: 'members', description: 'Remove members' },
        { name: 'member.view', module: 'members', description: 'View members' },
        { name: 'ownership.assign', module: 'property', description: 'Assign ownership' },
        { name: 'occupancy.assign', module: 'property', description: 'Assign occupancy' },
        { name: 'occupancy.remove', module: 'property', description: 'Remove occupancy' },
        { name: 'complaint.create', module: 'complaints', description: 'Create complaints' },
        { name: 'complaint.view_own', module: 'complaints', description: 'View own complaints' },
        { name: 'complaint.view_all', module: 'complaints', description: 'View all complaints' },
        { name: 'complaint.update_status', module: 'complaints', description: 'Update complaint status' },
        { name: 'complaint.broadcast', module: 'complaints', description: 'Broadcast complaints' },
        { name: 'announcement.create', module: 'announcements', description: 'Create announcements' },
        { name: 'announcement.view', module: 'announcements', description: 'View announcements' },
        { name: 'visitor.log', module: 'visitors', description: 'Log visitors' },
        { name: 'visitor.approve', module: 'visitors', description: 'Approve visitors' },
        { name: 'visitor.view_own', module: 'visitors', description: 'View own visitors' },
        { name: 'visitor.view_live', module: 'visitors', description: 'View live gate log' },
        { name: 'visitor.view_emergency', module: 'visitors', description: 'Emergency visitor access' },
        { name: 'service.create', module: 'services', description: 'Create services' },
        { name: 'service.view', module: 'services', description: 'View services' },
        { name: 'service.manage_personal', module: 'services', description: 'Manage personal staff' },
        { name: 'poll.create', module: 'polls', description: 'Create polls' },
        { name: 'poll.vote', module: 'polls', description: 'Vote on polls' },
        { name: 'poll.view', module: 'polls', description: 'View polls' },
        { name: 'emergency.declare', module: 'emergency', description: 'Declare emergency' },
        { name: 'emergency.view', module: 'emergency', description: 'View emergencies' },
        { name: 'asset.create', module: 'assets', description: 'Create assets' },
        { name: 'asset.book', module: 'assets', description: 'Book assets' },
        { name: 'asset.view', module: 'assets', description: 'View assets' },
        { name: 'asset.manage_booking', module: 'assets', description: 'Manage bookings' },
        { name: 'role.create', module: 'roles', description: 'Create custom roles' },
        { name: 'role.assign', module: 'roles', description: 'Assign roles' },
    ]

    for (const p of permissions) {
        await prisma.permission.upsert({
            where: { name: p.name },
            update: {},
            create: p
        })
    }

    // 2. Create system roles with permission bundles
    const roleBundles: Record<string, string[]> = {
        Builder: [
  'org.create', 'unit.create', 'unit.update', 'unit.view',
  'member.invite', 'member.remove', 'member.view',
  'ownership.assign', 'occupancy.assign',
  'complaint.view_all', 'complaint.update_status',  // ← add these
  'complaint.broadcast', 'complaint.create',         // ← add these
  'announcement.create', 'announcement.view',
  'visitor.view_live', 'visitor.view_emergency',     // ← add these
  'emergency.declare', 'emergency.view',
  'role.create', 'role.assign'
],
        Admin: [
            'unit.update', 'unit.view',
            'member.invite', 'member.remove', 'member.view',
            'occupancy.assign', 'occupancy.remove', 'ownership.assign',
            'complaint.view_all', 'complaint.update_status', 'complaint.broadcast',
            'announcement.create', 'announcement.view',
            'visitor.view_live', 'visitor.view_emergency',
            'service.create', 'service.view',
            'poll.create', 'poll.vote', 'poll.view',
            'emergency.declare', 'emergency.view',
            'asset.create', 'asset.manage_booking', 'asset.view',
            'role.create', 'role.assign'
        ],
        Resident: [
            'complaint.create', 'complaint.view_own',
            'announcement.view',
            'visitor.approve', 'visitor.view_own',
            'service.view', 'service.manage_personal',
            'poll.vote', 'poll.view',
            'emergency.declare', 'emergency.view',
            'asset.book', 'asset.view'
        ],
        Gatekeeper: [
            'visitor.log', 'visitor.view_live',
            'emergency.declare', 'emergency.view'
        ]
    }

    for (const [roleName, perms] of Object.entries(roleBundles)) {
        const role = await prisma.role.upsert({
            where: {
                // system roles have no orgId
                id: roleName.toLowerCase()
            },
            update: {},
            create: {
                id: roleName.toLowerCase(),
                name: roleName,
                isSystemRole: true,
                orgId: null
            }
        })

        for (const permName of perms) {
            const permission = await prisma.permission.findUnique({
                where: { name: permName }
            })
            if (permission) {
                await prisma.rolePermission.upsert({
                    where: {
                        roleId_permissionId: {
                            roleId: role.id,
                            permissionId: permission.id
                        }
                    },
                    update: {},
                    create: {
                        roleId: role.id,
                        permissionId: permission.id
                    }
                })
            }
        }
    }

    // 3. Create test society
    const org = await prisma.organization.create({
        data: {
            name: 'Green Valley Society',
            city: 'Pune',
            state: 'Maharashtra',
            pincode: '411001',
            address: '123 Test Road'
        }
    })

    // 4. Create property structure
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

    // 5. Create test users
    const builderUser = await prisma.user.create({
        data: {
            phone: '+911111111111',
            phoneVerified: true,
            person: {
                create: { fullName: 'Vikram Builder', phone: '+911111111111' }
            }
        }
    })

    const residentUser = await prisma.user.create({
        data: {
            phone: '+912222222222',
            phoneVerified: true,
            person: {
                create: { fullName: 'Arjun Mehta', phone: '+912222222222' }
            }
        }
    })

    const gatekeeperUser = await prisma.user.create({
        data: {
            phone: '+913333333333',
            phoneVerified: true,
            person: {
                create: { fullName: 'Ramesh Gate', phone: '+913333333333' }
            }
        }
    })

    // 6. Create memberships
    await prisma.membership.create({
        data: {
            userId: builderUser.id,
            orgId: org.id,
            roleId: 'builder'
        }
    })

    await prisma.membership.create({
        data: {
            userId: residentUser.id,
            orgId: org.id,
            roleId: 'resident'
        }
    })

    await prisma.membership.create({
        data: {
            userId: gatekeeperUser.id,
            orgId: org.id,
            roleId: 'gatekeeper'
        }
    })

    // 7. Create ownership and occupancy for Arjun
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

    console.log('Seed complete.')
    console.log('Test phones: +911111111111 (builder), +912222222222 (resident), +913333333333 (gatekeeper)')
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())