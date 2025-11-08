import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser, checkPermission } from "~/server/utils/auth";
import { detectSceneConflicts } from "~/server/utils/conflictDetection";

export const updateScene = baseProcedure
  .input(
    z.object({
      token: z.string(),
      sceneId: z.number(),
      sceneNumber: z.string().optional(),
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      location: z.string().optional(),
      scheduledTime: z.string().optional(),
      status: z.enum(["Unshot", "In Progress", "Complete"]).optional(),
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

    // Check for conflicts if scheduling-related fields are being updated
    let conflictInfo = null;
    const isSchedulingUpdate =
      input.scheduledTime !== undefined ||
      input.assignedActors !== undefined ||
      input.assignedCrew !== undefined ||
      input.expectedDurationMinutes !== undefined;

    if (isSchedulingUpdate) {
      // Determine the final values after update
      const scheduledTime = input.scheduledTime !== undefined
        ? input.scheduledTime ? new Date(input.scheduledTime) : null
        : existingScene.scheduledTime;

      if (scheduledTime) {
        const assignedActors = input.assignedActors !== undefined
          ? input.assignedActors
          : existingScene.assignedActors
          ? JSON.parse(existingScene.assignedActors)
          : [];

        const assignedCrew = input.assignedCrew !== undefined
          ? input.assignedCrew
          : existingScene.assignedCrew
          ? JSON.parse(existingScene.assignedCrew)
          : [];

        const durationMinutes = input.expectedDurationMinutes !== undefined
          ? input.expectedDurationMinutes
          : existingScene.expectedDurationMinutes;

        const conflictResult = await detectSceneConflicts(
          input.sceneId,
          scheduledTime,
          durationMinutes,
          assignedActors,
          assignedCrew,
          user.companyId,
          existingScene.showId
        );

        if (conflictResult.hasConflicts) {
          conflictInfo = conflictResult;
        }
      }
    }

    // Build update data object with only provided fields
    const updateData: any = {};
    
    if (input.sceneNumber !== undefined) updateData.sceneNumber = input.sceneNumber;
    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.location !== undefined) updateData.location = input.location;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.notes !== undefined) updateData.notes = input.notes;
    
    if (input.scheduledTime !== undefined) {
      updateData.scheduledTime = input.scheduledTime ? new Date(input.scheduledTime) : null;
    }
    
    if (input.assignedActors !== undefined) {
      updateData.assignedActors = input.assignedActors.length > 0
        ? JSON.stringify(input.assignedActors)
        : null;
    }
    
    if (input.assignedCrew !== undefined) {
      updateData.assignedCrew = input.assignedCrew.length > 0
        ? JSON.stringify(input.assignedCrew)
        : null;
    }

    if (input.shootingDayNumber !== undefined) updateData.shootingDayNumber = input.shootingDayNumber;
    if (input.expectedDurationMinutes !== undefined) updateData.expectedDurationMinutes = input.expectedDurationMinutes;
    if (input.scriptPageStart !== undefined) updateData.scriptPageStart = input.scriptPageStart;
    if (input.scriptPageEnd !== undefined) updateData.scriptPageEnd = input.scriptPageEnd;
    if (input.isReshoot !== undefined) updateData.isReshoot = input.isReshoot;
    if (input.specialInstructions !== undefined) updateData.specialInstructions = input.specialInstructions;
    if (input.cameraSetup !== undefined) updateData.cameraSetup = input.cameraSetup;
    if (input.lightingSetup !== undefined) updateData.lightingSetup = input.lightingSetup;
    if (input.soundRequirements !== undefined) updateData.soundRequirements = input.soundRequirements;
    if (input.makeup !== undefined) updateData.makeup = input.makeup;
    if (input.vfxRequired !== undefined) updateData.vfxRequired = input.vfxRequired;
    if (input.vfxNotes !== undefined) updateData.vfxNotes = input.vfxNotes;

    if (input.equipmentNeeded !== undefined) {
      updateData.equipmentNeeded = input.equipmentNeeded.length > 0
        ? JSON.stringify(input.equipmentNeeded)
        : null;
    }

    if (input.props !== undefined) {
      updateData.props = input.props.length > 0
        ? JSON.stringify(input.props)
        : null;
    }

    if (input.costumes !== undefined) {
      updateData.costumes = input.costumes.length > 0
        ? JSON.stringify(input.costumes)
        : null;
    }

    const scene = await db.scene.update({
      where: { id: input.sceneId },
      data: updateData,
    });

    return {
      id: scene.id,
      sceneNumber: scene.sceneNumber,
      title: scene.title,
      status: scene.status,
      conflicts: conflictInfo,
    };
  });
