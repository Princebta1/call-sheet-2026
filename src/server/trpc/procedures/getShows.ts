import { z } from "zod";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser } from "~/server/utils/auth";

export const getShows = baseProcedure
  .input(z.object({ token: z.string() }))
  .query(async ({ input }) => {
    const { user, payload } = await authenticateUser(input.token);

    // Check if user has permission to manage shows (can see all shows)
    const canManageShows = payload.permissions.includes("manage_shows");
    const isDeveloper = payload.role === "Developer";

    let shows;
    
    if (canManageShows) {
      // Users with manage_shows permission can see shows in the company
      // Developers can see all shows, others only see approved shows
      const whereClause: any = { companyId: user.companyId };
      if (!isDeveloper) {
        whereClause.approvalStatus = "approved";
      }

      shows = await db.show.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        include: {
          productionHouse: true,
          _count: {
            select: { scenes: true },
          },
        },
      });
    } else {
      // Other users can only see approved shows they are assigned to
      const userShows = await db.userShow.findMany({
        where: { userId: user.id },
        include: {
          show: {
            where: {
              approvalStatus: "approved",
            },
            include: {
              productionHouse: true,
              _count: {
                select: { scenes: true },
              },
            },
          },
        },
      });

      shows = userShows
        .map((us) => us.show)
        .filter((show) => show && show.companyId === user.companyId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    return shows.map((show) => ({
      id: show.id,
      title: show.title,
      productionHouse: show.productionHouse ? {
        id: show.productionHouse.id,
        name: show.productionHouse.name,
        logoURL: show.productionHouse.logoURL,
      } : null,
      description: show.description,
      status: show.status,
      approvalStatus: show.approvalStatus,
      startDate: show.startDate,
      endDate: show.endDate,
      sceneCount: show._count.scenes,
      createdAt: show.createdAt,
    }));
  });
