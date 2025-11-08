import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser, canManageTimers } from "~/server/utils/auth";

export const stopSceneTimer = baseProcedure
  .input(
    z.object({
      token: z.string(),
      sceneId: z.number(),
    })
  )
  .mutation(async ({ input }) => {
    const { user, payload } = await authenticateUser(input.token);

    if (!canManageTimers(payload.permissions)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only Admins and ADs can stop scene timers",
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

    if (!scene.timerStart) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Timer has not been started",
      });
    }

    if (scene.status === "Complete") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cannot stop timer for completed scene",
      });
    }

    const timerEnd = new Date();
    const durationMinutes = Math.round(
      (timerEnd.getTime() - scene.timerStart.getTime()) / 60000
    );

    const updatedScene = await db.scene.update({
      where: { id: input.sceneId },
      data: {
        timerEnd,
        durationMinutes,
      },
    });

    return {
      id: updatedScene.id,
      status: updatedScene.status,
      timerEnd: updatedScene.timerEnd,
      durationMinutes: updatedScene.durationMinutes,
    };
  });
