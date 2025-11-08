import { z } from "zod";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser } from "~/server/utils/auth";

export const getScenes = baseProcedure
  .input(
    z.object({
      token: z.string(),
      showId: z.number(),
      location: z.string().optional(),
      assignedActorIds: z.array(z.number()).optional(),
    })
  )
  .query(async ({ input }) => {
    const { user } = await authenticateUser(input.token);

    const whereClause: any = {
      showId: input.showId,
      companyId: user.companyId,
    };

    // Apply location filter (case-insensitive partial match)
    if (input.location && input.location.trim() !== "") {
      whereClause.location = {
        contains: input.location,
        mode: "insensitive",
      };
    }

    // Filter by assigned actors if specified
    const filterByActors = (scenes: any[]) => {
      if (!input.assignedActorIds || input.assignedActorIds.length === 0) {
        return scenes;
      }

      return scenes.filter((scene) => {
        if (!scene.assignedActors) return false;
        try {
          const actors = JSON.parse(scene.assignedActors);
          if (!Array.isArray(actors)) return false;
          // Check if any of the specified actors are in this scene
          return input.assignedActorIds!.some((actorId) => actors.includes(actorId));
        } catch {
          return false;
        }
      });
    };

    // Actors only see their assigned scenes
    if (user.role === "Actor") {
      const scenes = await db.scene.findMany({
        where: whereClause,
        orderBy: { sceneNumber: "asc" },
      });

      return filterByActors(scenes
        .filter((scene) => {
          if (!scene.assignedActors) return false;
          try {
            const actors = JSON.parse(scene.assignedActors);
            return actors.includes(user.id);
          } catch {
            return false;
          }
        }))
        .map((scene) => ({
          id: scene.id,
          sceneNumber: scene.sceneNumber,
          title: scene.title,
          description: scene.description,
          location: scene.location,
          scheduledTime: scene.scheduledTime,
          status: scene.status,
          durationMinutes: scene.durationMinutes,
          notes: scene.notes,
          shootingDayNumber: scene.shootingDayNumber,
          scriptPageStart: scene.scriptPageStart,
          scriptPageEnd: scene.scriptPageEnd,
          isReshoot: scene.isReshoot,
          specialInstructions: scene.specialInstructions,
          cameraSetup: scene.cameraSetup,
          props: scene.props,
          costumes: scene.costumes,
          makeup: scene.makeup,
        }));
    }

    // Everyone else sees all scenes
    const scenes = await db.scene.findMany({
      where: whereClause,
      orderBy: { sceneNumber: "asc" },
    });

    return filterByActors(scenes).map((scene) => ({
      id: scene.id,
      sceneNumber: scene.sceneNumber,
      title: scene.title,
      description: scene.description,
      location: scene.location,
      scheduledTime: scene.scheduledTime,
      status: scene.status,
      timerStart: scene.timerStart,
      timerEnd: scene.timerEnd,
      durationMinutes: scene.durationMinutes,
      assignedActors: scene.assignedActors,
      assignedCrew: scene.assignedCrew,
      notes: scene.notes,
      shootingDayNumber: scene.shootingDayNumber,
      expectedDurationMinutes: scene.expectedDurationMinutes,
      scriptPageStart: scene.scriptPageStart,
      scriptPageEnd: scene.scriptPageEnd,
      isReshoot: scene.isReshoot,
      equipmentNeeded: scene.equipmentNeeded,
      specialInstructions: scene.specialInstructions,
      cameraSetup: scene.cameraSetup,
      lightingSetup: scene.lightingSetup,
      soundRequirements: scene.soundRequirements,
      props: scene.props,
      costumes: scene.costumes,
      makeup: scene.makeup,
      vfxRequired: scene.vfxRequired,
      vfxNotes: scene.vfxNotes,
    }));
  });
