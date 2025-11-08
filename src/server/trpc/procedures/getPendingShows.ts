import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser } from "~/server/utils/auth";

export const getPendingShows = baseProcedure
  .input(z.object({ token: z.string() }))
  .query(async ({ input }) => {
    const { user, payload } = await authenticateUser(input.token);

    // Only developers can view pending shows
    if (payload.role !== "Developer") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only developers can view pending shows",
      });
    }

    const shows = await db.show.findMany({
      where: { approvalStatus: "pending" },
      orderBy: { createdAt: "desc" },
      include: {
        productionHouse: true,
        company: true,
        _count: {
          select: { scenes: true },
        },
      },
    });

    // Get creator information for each show
    const showsWithCreator = await Promise.all(
      shows.map(async (show) => {
        const creator = await db.user.findUnique({
          where: { id: show.createdBy },
          select: { id: true, name: true, email: true, roleId: true },
        });

        // Get the creator's role name
        let creatorRole = "Unknown";
        if (creator?.roleId) {
          const role = await db.role.findUnique({
            where: { id: creator.roleId },
            select: { name: true },
          });
          creatorRole = role?.name || "Unknown";
        }

        return {
          id: show.id,
          title: show.title,
          productionHouse: show.productionHouse ? {
            id: show.productionHouse.id,
            name: show.productionHouse.name,
            logoURL: show.productionHouse.logoURL,
          } : null,
          company: {
            id: show.company.id,
            name: show.company.name,
          },
          description: show.description,
          status: show.status,
          approvalStatus: show.approvalStatus,
          startDate: show.startDate,
          endDate: show.endDate,
          sceneCount: show._count.scenes,
          createdAt: show.createdAt,
          creator: creator ? {
            id: creator.id,
            name: creator.name,
            email: creator.email,
            role: creatorRole,
          } : null,
        };
      })
    );

    return showsWithCreator;
  });
