import { z } from "zod";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser } from "~/server/utils/auth";
import { getConflictsForScenes } from "~/server/utils/conflictDetection";

export const getScenesWithConflicts = baseProcedure
  .input(
    z.object({
      token: z.string(),
      showIds: z.array(z.number()).optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
    })
  )
  .query(async ({ input }) => {
    const { user } = await authenticateUser(input.token);
    
    const whereClause: any = {
      companyId: user.companyId,
      scheduledTime: { not: null },
    };
    
    // Apply show filter
    if (input.showIds && input.showIds.length > 0) {
      whereClause.showId = { in: input.showIds };
    }
    
    // Apply date range filter
    if (input.startDate || input.endDate) {
      whereClause.scheduledTime = {};
      if (input.startDate) {
        whereClause.scheduledTime.gte = new Date(input.startDate);
      }
      if (input.endDate) {
        whereClause.scheduledTime.lte = new Date(input.endDate);
      }
    }
    
    // Get scenes
    const scenes = await db.scene.findMany({
      where: whereClause,
      select: {
        id: true,
        showId: true,
        sceneNumber: true,
        title: true,
        scheduledTime: true,
        durationMinutes: true,
        assignedActors: true,
        assignedCrew: true,
      },
      orderBy: { scheduledTime: "asc" },
    });
    
    // Get conflicts for all scenes
    const sceneIds = scenes.map(s => s.id);
    const conflictMap = await getConflictsForScenes(sceneIds, user.companyId);
    
    // Combine scenes with their conflict information
    return scenes.map(scene => ({
      ...scene,
      hasConflicts: conflictMap.has(scene.id),
      conflicts: conflictMap.get(scene.id) || [],
    }));
  });
