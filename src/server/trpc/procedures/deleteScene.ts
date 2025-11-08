import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser, checkPermission } from "~/server/utils/auth";

export const deleteScene = baseProcedure
  .input(
    z.object({
      token: z.string(),
      sceneId: z.number(),
    })
  )
  .mutation(async ({ input }) => {
    const { user, payload } = await authenticateUser(input.token);
    checkPermission(payload.permissions, "manage_scenes");

    // Verify the scene exists and belongs to the user's company
    const existingScene = await db.scene.findUnique({
      where: { id: input.sceneId },
    });

    if (!existingScene) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Scene not found",
      });
    }

    if (existingScene.companyId !== user.companyId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have access to this scene",
      });
    }

    await db.scene.delete({
      where: { id: input.sceneId },
    });

    return {
      success: true,
      message: "Scene deleted successfully",
    };
  });
