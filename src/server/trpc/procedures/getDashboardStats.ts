import { z } from "zod";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser } from "~/server/utils/auth";

export const getDashboardStats = baseProcedure
  .input(z.object({ token: z.string() }))
  .query(async ({ input }) => {
    const { user, payload } = await authenticateUser(input.token);

    // Developer gets system-wide stats
    if (user.role === "Developer") {
      const [totalCompanies, totalUsers, totalShows, totalScenes] = await Promise.all([
        db.company.count(),
        db.user.count(),
        db.show.count(),
        db.scene.count(),
      ]);

      const activeCompanies = await db.company.count({
        where: { isActive: true },
      });

      return {
        role: "Developer",
        stats: {
          totalCompanies,
          activeCompanies,
          totalUsers,
          totalShows,
          totalScenes,
        },
      };
    }

    // Check if user can manage shows (Admin/Manager)
    const canManageShows = payload.permissions.includes("manage_shows");

    // Get shows based on permissions
    let shows;
    if (canManageShows) {
      // Admin/Manager can see all company shows
      shows = await db.show.findMany({
        where: { companyId: user.companyId },
        include: {
          _count: {
            select: { scenes: true },
          },
        },
      });
    } else {
      // Other users can only see shows they are assigned to
      const userShows = await db.userShow.findMany({
        where: { userId: user.id },
        include: {
          show: {
            include: {
              _count: {
                select: { scenes: true },
              },
            },
          },
        },
      });

      shows = userShows
        .map((us) => us.show)
        .filter((show) => show.companyId === user.companyId);
    }

    const totalShows = shows.length;
    const activeShows = shows.filter((s) => s.status === "Shooting").length;
    const totalScenes = shows.reduce((acc, show) => acc + show._count.scenes, 0);

    // Actor-specific stats
    if (user.role === "Actor") {
      // Get scenes assigned to this actor
      const allScenes = await db.scene.findMany({
        where: {
          companyId: user.companyId,
          showId: { in: shows.map((s) => s.id) },
        },
      });

      const assignedScenes = allScenes.filter((scene) => {
        if (!scene.assignedActors) return false;
        try {
          const actors = JSON.parse(scene.assignedActors);
          return actors.includes(user.id);
        } catch {
          return false;
        }
      });

      const upcomingScenes = assignedScenes.filter(
        (scene) =>
          scene.status === "Unshot" &&
          scene.scheduledTime &&
          new Date(scene.scheduledTime) > new Date()
      );

      const completedScenes = assignedScenes.filter(
        (scene) => scene.status === "Complete"
      );

      return {
        role: "Actor",
        stats: {
          totalShows,
          activeShows,
          assignedScenes: assignedScenes.length,
          upcomingScenes: upcomingScenes.length,
          completedScenes: completedScenes.length,
        },
      };
    }

    // Get team member count for Admin/Manager/Crew
    let teamMemberCount = 0;
    if (payload.permissions.includes("view_team")) {
      teamMemberCount = await db.user.count({
        where: {
          companyId: user.companyId,
          isActive: true,
        },
      });
    }

    // Get scene status breakdown for Manager/Viewer/Crew
    const scenes = await db.scene.findMany({
      where: {
        companyId: user.companyId,
        showId: { in: shows.map((s) => s.id) },
      },
      select: {
        status: true,
        scheduledTime: true,
      },
    });

    const unshotScenes = scenes.filter((s) => s.status === "Unshot").length;
    const inProgressScenes = scenes.filter((s) => s.status === "In Progress").length;
    const completeScenes = scenes.filter((s) => s.status === "Complete").length;

    // Get upcoming scenes (scheduled in the future)
    const upcomingScenes = scenes.filter(
      (scene) =>
        scene.status === "Unshot" &&
        scene.scheduledTime &&
        new Date(scene.scheduledTime) > new Date()
    ).length;

    return {
      role: user.role,
      stats: {
        totalShows,
        activeShows,
        totalScenes,
        teamMemberCount,
        unshotScenes,
        inProgressScenes,
        completeScenes,
        upcomingScenes,
      },
    };
  });
