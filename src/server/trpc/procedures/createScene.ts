import { z } from "zod";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser, checkPermission } from "~/server/utils/auth";
import { detectSceneConflicts } from "~/server/utils/conflictDetection";

export const createScene = baseProcedure
  .input(
    z.object({
      token: z.string(),
      showId: z.number(),
      sceneNumber: z.string(),
      title: z.string().min(1),
      description: z.string().optional(),
      location: z.string().optional(),
      scheduledTime: z.string().optional(),
      assignedActors: z.array(z.number()).optional(),
      assignedCrew: z.array(z.number()).optional(),
      notes: z.string().optional(),
      shootingDayNumber: z.number().optional(),
      expectedDurationMinutes: z.number().optional(),
      scriptPageStart: z.string().optional(),
      scriptPageEnd: z.string().optional(),
      isReshoot: z.boolean().optional(),
      equipmentNeeded: z.array(z.string()).optional(),
      specialInstructions: z.string().optional(),
      cameraSetup: z.string().optional(),
      lightingSetup: z.string().optional(),
      soundRequirements: z.string().optional(),
      props: z.array(z.string()).optional(),
      costumes: z.array(z.string()).optional(),
      makeup: z.string().optional(),
      vfxRequired: z.boolean().optional(),
      vfxNotes: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const { user, payload } = await authenticateUser(input.token);
    checkPermission(payload.permissions, "manage_scenes");

    // Check for conflicts if scene is scheduled
    let conflictInfo = null;
    if (input.scheduledTime) {
      const scheduledTime = new Date(input.scheduledTime);
      const assignedActors = input.assignedActors || [];
      const assignedCrew = input.assignedCrew || [];
      
      const conflictResult = await detectSceneConflicts(
        null, // sceneId is null for new scenes
        scheduledTime,
        input.expectedDurationMinutes || null,
        assignedActors,
        assignedCrew,
        user.companyId,
        input.showId
      );
      
      if (conflictResult.hasConflicts) {
        conflictInfo = conflictResult;
      }
    }

    const scene = await db.scene.create({
      data: {
        showId: input.showId,
        companyId: user.companyId,
        sceneNumber: input.sceneNumber,
        title: input.title,
        description: input.description,
        location: input.location,
        scheduledTime: input.scheduledTime ? new Date(input.scheduledTime) : null,
        assignedActors: input.assignedActors
          ? JSON.stringify(input.assignedActors)
          : null,
        assignedCrew: input.assignedCrew
          ? JSON.stringify(input.assignedCrew)
          : null,
        notes: input.notes,
        shootingDayNumber: input.shootingDayNumber,
        expectedDurationMinutes: input.expectedDurationMinutes,
        scriptPageStart: input.scriptPageStart,
        scriptPageEnd: input.scriptPageEnd,
        isReshoot: input.isReshoot ?? false,
        equipmentNeeded: input.equipmentNeeded
          ? JSON.stringify(input.equipmentNeeded)
          : null,
        specialInstructions: input.specialInstructions,
        cameraSetup: input.cameraSetup,
        lightingSetup: input.lightingSetup,
        soundRequirements: input.soundRequirements,
        props: input.props ? JSON.stringify(input.props) : null,
        costumes: input.costumes ? JSON.stringify(input.costumes) : null,
        makeup: input.makeup,
        vfxRequired: input.vfxRequired ?? false,
        vfxNotes: input.vfxNotes,
      },
    });

    return {
      id: scene.id,
      sceneNumber: scene.sceneNumber,
      title: scene.title,
      status: scene.status,
      conflicts: conflictInfo,
    };
  });
