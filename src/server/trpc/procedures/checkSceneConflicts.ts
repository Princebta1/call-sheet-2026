import { z } from "zod";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser } from "~/server/utils/auth";
import { detectSceneConflicts } from "~/server/utils/conflictDetection";

export const checkSceneConflicts = baseProcedure
  .input(
    z.object({
      token: z.string(),
      sceneId: z.number().optional(), // Optional for new scenes
      scheduledTime: z.string().datetime(),
      durationMinutes: z.number().optional(),
      assignedActors: z.array(z.number()).optional(),
      assignedCrew: z.array(z.number()).optional(),
      showId: z.number().optional(),
    })
  )
  .query(async ({ input }) => {
    const { user } = await authenticateUser(input.token);
    
    const scheduledTime = new Date(input.scheduledTime);
    const assignedActors = input.assignedActors || [];
    const assignedCrew = input.assignedCrew || [];
    
    const result = await detectSceneConflicts(
      input.sceneId || null,
      scheduledTime,
      input.durationMinutes || null,
      assignedActors,
      assignedCrew,
      user.companyId,
      input.showId
    );
    
    return result;
  });
