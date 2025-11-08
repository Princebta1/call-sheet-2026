import { z } from "zod";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser, checkPermission } from "~/server/utils/auth";

export const createProductionHouse = baseProcedure
  .input(
    z.object({
      token: z.string(),
      name: z.string().min(1, "Name is required"),
      adminId: z.number({ required_error: "Admin is required" }),
      parentProductionHouseId: z.number().optional(),
      description: z.string().optional(),
      logoURL: z.string().optional(),
      contactEmail: z.string().email().optional().or(z.literal("")),
      contactPhone: z.string().optional(),
      website: z.string().url().optional().or(z.literal("")),
      address: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const { user, payload } = await authenticateUser(input.token);
    checkPermission(payload.permissions, "manage_production_houses");

    const productionHouse = await db.productionHouse.create({
      data: {
        companyId: user.companyId,
        adminId: input.adminId,
        parentProductionHouseId: input.parentProductionHouseId,
        name: input.name,
        description: input.description,
        logoURL: input.logoURL,
        contactEmail: input.contactEmail || null,
        contactPhone: input.contactPhone,
        website: input.website || null,
        address: input.address,
      },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        parentProductionHouse: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      id: productionHouse.id,
      name: productionHouse.name,
      adminId: productionHouse.adminId,
      admin: productionHouse.admin,
      parentProductionHouseId: productionHouse.parentProductionHouseId,
      parentProductionHouse: productionHouse.parentProductionHouse,
      description: productionHouse.description,
      logoURL: productionHouse.logoURL,
      contactEmail: productionHouse.contactEmail,
      contactPhone: productionHouse.contactPhone,
      website: productionHouse.website,
      address: productionHouse.address,
      createdAt: productionHouse.createdAt,
    };
  });
