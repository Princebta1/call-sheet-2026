import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser, checkPermission } from "~/server/utils/auth";

export const deleteCharacterRole = baseProcedure
  .input(
    z.object({
      token: z.string(),
      characterRoleId: z.number(),
    })
  )
  .mutation(async ({ input }) => {
    const { user, payload } = await authenticateUser(input.token);
    checkPermission(payload.permissions, "manage_team");

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

    // Delete the character role (cascade will handle actorCharacters)
    await db.characterRole.delete({
      where: { id: input.characterRoleId },
    });

    return { success: true };
  });
