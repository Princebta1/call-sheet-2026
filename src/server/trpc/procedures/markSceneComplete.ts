import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser, canMarkSceneComplete } from "~/server/utils/auth";
import { autoGenerateReports } from "~/server/utils/autoGenerateReports";

export const markSceneComplete = baseProcedure
  .input(
    z.object({
      token: z.string(),
      sceneId: z.number(),
    })
  )
  .mutation(async ({ input }) => {
    const { user, payload } = await authenticateUser(input.token);

    if (!canMarkSceneComplete(payload.permissions)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only Directors and Admins can mark scenes complete",
      });
    }

    const scene = await db.scene.findUnique({
      where: { id: input.sceneId },
    });

    if (!scene) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Scene not found",
      });
    }

    if (scene.companyId !== user.companyId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Access denied",
      });
    }

    const updatedScene = await db.scene.update({
      where: { id: input.sceneId },
      data: {
        status: "Complete",
      },
    });

    // Attempt to auto-generate report if all scenes for this day are now complete
    if (updatedScene.scheduledTime) {
      try {
        const sceneDate = new Date(updatedScene.scheduledTime);
        await autoGenerateReports({
          companyId: user.companyId,
          showId: updatedScene.showId,
          date: sceneDate,
        });
      } catch (error) {
        // Log error but don't fail the scene completion
        console.error("Failed to auto-generate report:", error);
      }
    }

    return {
      id: updatedScene.id,
      status: updatedScene.status,
    };
  });
