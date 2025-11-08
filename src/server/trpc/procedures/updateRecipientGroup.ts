import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser, canManageTeam } from "~/server/utils/auth";

export const updateRecipientGroup = baseProcedure
  .input(
    z.object({
      token: z.string(),
      groupId: z.number(),
      name: z.string().min(1, "Name is required").optional(),
      description: z.string().optional(),
      userIds: z.array(z.number()).optional(),
    })
  )
  .mutation(async ({ input }) => {
    const { user } = await authenticateUser(input.token);

    if (!canManageTeam(user.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have permission to manage recipient groups",
      });
    }

    // Verify the group exists and belongs to the user's company
    const existingGroup = await db.recipientGroup.findUnique({
      where: { id: input.groupId },
    });

    if (!existingGroup || existingGroup.companyId !== user.companyId) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Recipient group not found",
      });
    }

    // If updating name, check for conflicts
    if (input.name && input.name !== existingGroup.name) {
      const conflictingGroup = await db.recipientGroup.findUnique({
        where: {
          companyId_name: {
            companyId: user.companyId,
            name: input.name,
          },
        },
      });

      if (conflictingGroup) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A group with this name already exists",
        });
      }
    }

    // If updating user IDs, verify they belong to the company
    if (input.userIds) {
      const users = await db.user.findMany({
        where: {
          id: { in: input.userIds },
          companyId: user.companyId,
        },
      });

      if (users.length !== input.userIds.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "One or more user IDs are invalid",
        });
      }
    }

    // Update the group
    const updateData: any = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;

    // If updating members, delete old ones and create new ones
    if (input.userIds !== undefined) {
      await db.recipientGroupMember.deleteMany({
        where: { groupId: input.groupId },
      });

      updateData.members = {
        create: input.userIds.map((userId) => ({
          userId,
        })),
      };
    }

    const updatedGroup = await db.recipientGroup.update({
      where: { id: input.groupId },
      data: updateData,
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });

    return {
      id: updatedGroup.id,
      name: updatedGroup.name,
      description: updatedGroup.description,
      memberCount: updatedGroup.members.length,
      members: updatedGroup.members.map((m) => m.user),
      createdAt: updatedGroup.createdAt,
      updatedAt: updatedGroup.updatedAt,
    };
  });
