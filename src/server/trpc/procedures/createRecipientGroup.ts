import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser, canManageTeam } from "~/server/utils/auth";

export const createRecipientGroup = baseProcedure
  .input(
    z.object({
      token: z.string(),
      name: z.string().min(1, "Name is required"),
      description: z.string().optional(),
      userIds: z.array(z.number()).default([]),
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

    // Check if a group with this name already exists
    const existingGroup = await db.recipientGroup.findUnique({
      where: {
        companyId_name: {
          companyId: user.companyId,
          name: input.name,
        },
      },
    });

    if (existingGroup) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "A group with this name already exists",
      });
    }

    // Verify all user IDs belong to the company
    if (input.userIds.length > 0) {
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

    // Create the group with members
    const group = await db.recipientGroup.create({
      data: {
        companyId: user.companyId,
        name: input.name,
        description: input.description,
        members: {
          create: input.userIds.map((userId) => ({
            userId,
          })),
        },
      },
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
      id: group.id,
      name: group.name,
      description: group.description,
      memberCount: group.members.length,
      members: group.members.map((m) => m.user),
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    };
  });
