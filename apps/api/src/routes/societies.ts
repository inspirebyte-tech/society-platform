import { Router } from "express";
import { authenticate } from '../middleware/auth' 
import { prisma } from '../lib/prisma'
import { validateRequired } from "../utils/validate";

const router = Router();
const requireFields = ["name", "address", "city", "state", "pincode", "type"];


router.post('/create', authenticate, async(req, res) => {
    try{
        const loggedUser = (req as any).user;
        const validation = validateRequired(req.body, requireFields);
        if(!validation.valid){
            return res.status(400).json({
                "status": "Failed",
                "message": `${validation.field} is required`
            })
        }
        const { name, address, city, state, pincode, type } = req.body ;
        const result = await prisma.$transaction( async  (tx)=>{
            const society = await tx.organization.create({
                data: {
                    name, 
                    address, 
                    city, 
                    state, 
                    pincode,
                }
            });
            console.log(`[CREATE_SOCIETY] Society Created: ${society.id}`);
            const propertyNode = await tx.propertyNode.create({
                data: {
                    orgId: society?.id,
                    name,
                    nodeType: type,
                    code: pincode,
                }
            });
            console.log(`[CREATE_SOCIETY] PropertyNode Created: ${propertyNode.id}`);
            const membership = await tx.membership.create({
                data: {
                    userId: loggedUser?.userId,
                    orgId: society?.id,
                    roleId: 'builder'
                }
            });
            console.log(`[CREATE_SOCIETY] Membership Created: ${membership.id}`);
            return society;
        });
        return res.status(201).json({
            status: "Success",
            data: result
        });
    } catch (error: any){
        console.error(`[CREATE_SOCIETY_ERROR]:`, error);
        
        // ✅ Prisma specific error handling
        if (error.code === 'P2002') {
            return res.status(409).json({
                status: "Failed",
                message: "Duplicate entry detected."
            });
        }
        
        if (error.code === 'P2003') {
            return res.status(400).json({
                status: "Failed",
                message: "Invalid foreign key reference."
            });
        }
        
        // ✅ Generic fallback
        return res.status(500).json({
            status: "Error",
            message: "Something went wrong while creating society.",
        });
    }
});

router.get('/:userId/all', authenticate, async(req, res) =>{
    const loggedUser = (req as any).user;
    const { userId } = req.params as {userId: string};
    console.log(`UserId ${loggedUser.userId}`);
    try{
        if (loggedUser.userId !== userId) {
            return res.status(403).json({
                status: "Failed",
                message: "Unauthorized access"
            });
        }
        const memberships = await prisma.membership.findMany({
            where: {
                userId,
                isActive: true,
            },
            select: {
                roleId: true,
                org: {
                    select:{
                        id: true,
                        name: true,
                        city: true,
                        propertyNodes: {
                            where: {
                                parentId: null
                            },
                            select: {
                                nodeType: true
                            },
                            take: 1
                        },
                        _count: {
                            select: {
                                propertyNodes: {
                                    where: {
                                        nodeType: 'UNIT'
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        
        if (!memberships || memberships.length === 0) {
            return res.status(200).json({
                status: "Success",
                data: []
            });
        }
        
        const societies = memberships.map( m => ({
            id: m.org.id,
            name: m.org.name,
            city: m.org.city,
            role: m.roleId,
            type: m.org.propertyNodes[0]?.nodeType || null,
            unitCount: m.org._count.propertyNodes
        }))
        
        return res.status(200).json({
            status: "Success",
            data: societies
        });
        
        
    } catch (error: any){
        console.error("[GET_SOCIETIES_ERROR]:", error);
        
        // Prisma specific errors
        if (error.code === 'P2002') {
            return res.status(409).json({
                status: "Failed",
                message: "Duplicate data issue"
            });
        }
        
        if (error.code === 'P2003') {
            return res.status(400).json({
                status: "Failed",
                message: "Invalid reference data"
            });
        }
        
        return res.status(500).json({
            status: "Error",
            message: "Something went wrong while fetching societies"
        });
    }
});

export default router