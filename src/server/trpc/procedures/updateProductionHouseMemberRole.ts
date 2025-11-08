import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser, getUserPermissions, checkPermission } from "~/server/utils/auth";

export const updateProductionHouseMemberRole = baseProcedure
  .input(
    z.object({
      token: z.string(),
      memberId: z.number(),
      roleId: z.number(),
    })
  )
  .mutation(async ({ input }) => {
    const { user } = await authenticateUser(input.token);

    // Check permissions
    const permissions = await getUserPermissions(user.id);
    checkPermission(permissions, "manage_team");

    // Get the member to update
    const member = await db.productionHouseMember.findUnique({
      where: { id: input.memberId },
      include: {
        productionHouse: true,
        user: true,
      },
    });

    if (!member) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Member not found",
      });
    }

    // Verify the production house belongs to the user's company
    if (member.productionHouse.companyId !== user.companyId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Cannot update members from other companies",
      });
    }

    // Prevent users from changing their own role in a production house
    if (member.userId === user.id) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cannot change your own role",
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

    // Update the member's role
    const updatedMember = await db.productionHouseMember.update({
      where: { id: input.memberId },
      data: { roleId: input.roleId },
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
        id: updatedMember.id,
        userName: updatedMember.user.name,
        userEmail: updatedMember.user.email,
        roleName: updatedMember.role?.name || "No Role",
      },
    };
  });
