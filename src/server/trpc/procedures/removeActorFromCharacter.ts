import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser, checkPermission } from "~/server/utils/auth";

export const removeActorFromCharacter = baseProcedure
  .input(
    z.object({
      token: z.string(),
      actorCharacterId: z.number(),
    })
  )
  .mutation(async ({ input }) => {
    const { user, payload } = await authenticateUser(input.token);
    checkPermission(payload.permissions, "manage_team");

    // Verify the assignment exists
    const assignment = await db.actorCharacter.findUnique({
      where: { id: input.actorCharacterId },
      include: {
        show: true,
      },
    });

    if (!assignment || assignment.show.companyId !== user.companyId) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Assignment not found",
      });
    }

    // Delete the assignment
    await db.actorCharacter.delete({
      where: { id: input.actorCharacterId },
    });

    return { success: true };
  });
