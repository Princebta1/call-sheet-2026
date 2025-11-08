import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser, checkPermission } from "~/server/utils/auth";

export const updateProductionHouse = baseProcedure
  .input(
    z.object({
      token: z.string(),
      id: z.number(),
      name: z.string().min(1, "Name is required").optional(),
      adminId: z.number().optional(),
      parentProductionHouseId: z.number().optional().nullable(),
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

    // Verify the production house exists and belongs to the user's company
    const productionHouse = await db.productionHouse.findUnique({
      where: { id: input.id },
    });

    if (!productionHouse) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Production house not found",
      });
    }

    if (productionHouse.companyId !== user.companyId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have permission to update this production house",
      });
    }

    // Prevent circular references: a production house cannot be its own parent
    // or have itself in its parent chain
    if (input.parentProductionHouseId !== undefined && input.parentProductionHouseId !== null) {
      if (input.parentProductionHouseId === input.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A production house cannot be its own parent",
        });
      }

      // Check if the parent exists and belongs to the same company
      const parentHouse = await db.productionHouse.findUnique({
        where: { id: input.parentProductionHouseId },
      });

      if (!parentHouse) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Parent production house not found",
        });
      }

      if (parentHouse.companyId !== user.companyId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Parent production house must belong to the same company",
        });
      }
    }

    const updated = await db.productionHouse.update({
      where: { id: input.id },
      data: {
        name: input.name,
        adminId: input.adminId,
        parentProductionHouseId: input.parentProductionHouseId === null ? null : input.parentProductionHouseId,
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
      id: updated.id,
      name: updated.name,
      adminId: updated.adminId,
      admin: updated.admin,
      parentProductionHouseId: updated.parentProductionHouseId,
      parentProductionHouse: updated.parentProductionHouse,
      description: updated.description,
      logoURL: updated.logoURL,
      contactEmail: updated.contactEmail,
      contactPhone: updated.contactPhone,
      website: updated.website,
      address: updated.address,
      updatedAt: updated.updatedAt,
    };
  });
