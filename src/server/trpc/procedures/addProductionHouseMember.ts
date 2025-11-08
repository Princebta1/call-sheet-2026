import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser, getUserPermissions, checkPermission } from "~/server/utils/auth";

export const addProductionHouseMember = baseProcedure
  .input(
    z.object({
      token: z.string(),
      productionHouseId: z.number(),
      userId: z.number(),
      roleId: z.number(),
    })
  )
  .mutation(async ({ input }) => {
    const { user } = await authenticateUser(input.token);

    // Check permissions
    const permissions = await getUserPermissions(user.id);
    checkPermission(permissions, "manage_team");

    // Verify the production house belongs to the user's company
    const productionHouse = await db.productionHouse.findFirst({
      where: {
        id: input.productionHouseId,
        companyId: user.companyId,
      },
    });

    if (!productionHouse) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Production house not found",
      });
    }

    // Verify the target user is in the same company
    const targetUser = await db.user.findUnique({
      where: { id: input.userId },
    });

    if (!targetUser || targetUser.companyId !== user.companyId) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found or not in your company",
      });
    }

    // Verify the role exists and is available to this company
    const role = await db.role.findFirst({
      where: {
        id: input.roleId,
        OR: [
          { isSystemRole: true, companyId: null },
          { companyId: user.companyId, isSystemRole: false },
        ],
      },
    });

    if (!role) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid role selected",
      });
    }

    // Check if user is already a member
    const existingMember = await db.productionHouseMember.findUnique({
      where: {
        productionHouseId_userId: {
          productionHouseId: input.productionHouseId,
          userId: input.userId,
        },
      },
    });

    if (existingMember) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "User is already a member of this production house",
      });
    }

    // Add the user as a member
    const member = await db.productionHouseMember.create({
      data: {
        productionHouseId: input.productionHouseId,
        userId: input.userId,
        roleId: input.roleId,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        role: {
          select: {
            name: true,
          },
        },
      },
    });

    return {
      success: true,
      member: {
        id: member.id,
        userName: member.user.name,
        userEmail: member.user.email,
        roleName: member.role?.name || "No Role",
      },
    };
  });
