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
})

export default router