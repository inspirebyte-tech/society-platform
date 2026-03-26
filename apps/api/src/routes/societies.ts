import { response, Router } from "express";
import { authenticate } from '../middleware/auth' 
import { prisma } from '../lib/prisma'
import { connect } from "http2";

const router = Router();

router.post('/create', authenticate, async(req, res) => {
    const loggedUser = (req as any).user;
    console.log(`logged User: ${JSON.stringify(loggedUser)}`)
    const { name, address, city, state, pincode, type } = req.body ;
    if(!name){
        return res.status(400).json(
            {
                "status" : "Failed",
                "message" : "Name is required for the society."
            });
        }
        const society = await prisma.organization.create({
            data: {
                name, 
                address, 
                city, 
                state, 
                pincode,
            }
        })
        console.log(`society: ${JSON.stringify(society)}`);
        if(society){
            const propertyNode = await prisma.propertyNode.create({
                data: {
                    orgId: society?.id,
                    name,
                    nodeType: type,
                    code: pincode,
                }
            });
            if (society && propertyNode){
            const membership = await prisma.membership.create({
                data: {
                    userId: loggedUser?.userId,
                    orgId: society?.id,
                    roleId: 'builder'
                }
            })
            return res.status(200).json({
                society,
                propertyNode,
                membership
            });
        }
        }
    })
    
    export default router