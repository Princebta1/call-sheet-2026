import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser, checkPermission } from "~/server/utils/auth";

export const updateCharacterRole = baseProcedure
  .input(
    z.object({
      token: z.string(),
      characterRoleId: z.number(),
      name: z.string().min(1, "Character name is required").optional(),
      description: z.string().optional(),
      type: z.enum(["Main", "Supporting", "Minor", "Extra"]).optional(),
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

    // Update the character role
    const updated = await db.characterRole.update({
      where: { id: input.characterRoleId },
      data: {
        name: input.name,
        description: input.description,
        type: input.type,
      },
    });

    return { characterRole: updated };
  });
