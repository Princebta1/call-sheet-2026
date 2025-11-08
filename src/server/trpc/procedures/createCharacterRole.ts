import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser, checkPermission } from "~/server/utils/auth";

export const createCharacterRole = baseProcedure
  .input(
    z.object({
      token: z.string(),
      showId: z.number(),
      name: z.string().min(1, "Character name is required"),
      description: z.string().optional(),
      type: z.enum(["Main", "Supporting", "Minor", "Extra"]).default("Supporting"),
    })
  )
  .mutation(async ({ input }) => {
    const { user, payload } = await authenticateUser(input.token);
    checkPermission(payload.permissions, "manage_team");

    // Verify the show exists and belongs to the user's company
    const show = await db.show.findUnique({
      where: { id: input.showId },
    });

    if (!show || show.companyId !== user.companyId) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Show not found",
      });
    }

    // Create the character role
    const characterRole = await db.characterRole.create({
      data: {
        showId: input.showId,
        name: input.name,
        description: input.description,
        type: input.type,
      },
    });

    return { characterRole };
  });
