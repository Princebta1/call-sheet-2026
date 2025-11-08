import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser, checkPermission } from "~/server/utils/auth";

export const assignActorToCharacter = baseProcedure
  .input(
    z.object({
      token: z.string(),
      userId: z.number(),
      characterRoleId: z.number(),
      showId: z.number(),
      notes: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const { user, payload } = await authenticateUser(input.token);
    checkPermission(payload.permissions, "manage_team");

    // Verify the actor exists and is in the same company
    const actor = await db.user.findUnique({
      where: { id: input.userId },
    });

    if (!actor || actor.companyId !== user.companyId) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Actor not found",
      });
    }

    // Verify the character role exists
    const characterRole = await db.characterRole.findUnique({
      where: { id: input.characterRoleId },
      include: { show: true },
    });

    if (!characterRole || characterRole.show.companyId !== user.companyId) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Character role not found",
      });
    }

    // Verify the show matches
    if (characterRole.showId !== input.showId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Character role does not belong to the specified show",
      });
    }

    // Create the assignment (upsert to handle duplicates)
    const assignment = await db.actorCharacter.upsert({
      where: {
        userId_characterRoleId_showId: {
          userId: input.userId,
          characterRoleId: input.characterRoleId,
          showId: input.showId,
        },
      },
      create: {
        userId: input.userId,
        characterRoleId: input.characterRoleId,
        showId: input.showId,
        notes: input.notes,
      },
      update: {
        notes: input.notes,
      },
    });

    return { assignment };
  });
