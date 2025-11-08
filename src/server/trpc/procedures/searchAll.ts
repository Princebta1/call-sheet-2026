import { z } from "zod";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser } from "~/server/utils/auth";

export const searchAll = baseProcedure
  .input(
    z.object({
      token: z.string(),
      query: z.string().min(1),
    })
  )
  .query(async ({ input }) => {
    const { user, payload } = await authenticateUser(input.token);

    const searchQuery = input.query.trim();
    const companyId = user.companyId;

    // Limit results per category
    const LIMIT_PER_CATEGORY = 5;

    // Search shows (productions)
    const shows = await db.show.findMany({
      where: {
        companyId,
        approvalStatus: "approved",
        OR: [
          {
            title: {
              contains: searchQuery,
              mode: "insensitive",
            },
          },
          {
            description: {
              contains: searchQuery,
              mode: "insensitive",
            },
          },
        ],
      },
      take: LIMIT_PER_CATEGORY,
      orderBy: { createdAt: "desc" },
      include: {
        productionHouse: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Search scenes
    const scenes = await db.scene.findMany({
      where: {
        companyId,
        OR: [
          {
            sceneNumber: {
              contains: searchQuery,
              mode: "insensitive",
            },
          },
          {
            title: {
              contains: searchQuery,
              mode: "insensitive",
            },
          },
          {
            description: {
              contains: searchQuery,
              mode: "insensitive",
            },
          },
          {
            location: {
              contains: searchQuery,
              mode: "insensitive",
            },
          },
        ],
      },
      take: LIMIT_PER_CATEGORY,
      orderBy: { createdAt: "desc" },
      include: {
        show: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Search actors - find users who have actor character assignments
    // and match the search query
    const actorCharacters = await db.actorCharacter.findMany({
      where: {
        show: {
          companyId,
          approvalStatus: "approved",
        },
        user: {
          OR: [
            {
              name: {
                contains: searchQuery,
                mode: "insensitive",
              },
            },
            {
              email: {
                contains: searchQuery,
                mode: "insensitive",
              },
            },
          ],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImage: true,
          },
        },
        characterRole: {
          select: {
            id: true,
            name: true,
          },
        },
        show: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      take: LIMIT_PER_CATEGORY,
    });

    // Deduplicate actors (same actor might play multiple roles)
    const uniqueActors = Array.from(
      new Map(
        actorCharacters.map((ac) => [
          ac.user.id,
          {
            id: ac.user.id,
            name: ac.user.name,
            email: ac.user.email,
            profileImage: ac.user.profileImage,
            roles: actorCharacters
              .filter((a) => a.user.id === ac.user.id)
              .map((a) => ({
                characterName: a.characterRole.name,
                showId: a.show.id,
                showTitle: a.show.title,
              })),
          },
        ])
      ).values()
    ).slice(0, LIMIT_PER_CATEGORY);

    return {
      productions: shows.map((show) => ({
        id: show.id,
        title: show.title,
        description: show.description,
        status: show.status,
        productionHouse: show.productionHouse
          ? {
              id: show.productionHouse.id,
              name: show.productionHouse.name,
            }
          : null,
      })),
      scenes: scenes.map((scene) => ({
        id: scene.id,
        sceneNumber: scene.sceneNumber,
        title: scene.title,
        description: scene.description,
        location: scene.location,
        status: scene.status,
        show: {
          id: scene.show.id,
          title: scene.show.title,
        },
      })),
      actors: uniqueActors,
    };
  });
