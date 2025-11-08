import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser } from "~/server/utils/auth";

export const getCharacterRoles = baseProcedure
  .input(
    z.object({
      token: z.string(),
      showId: z.number(),
    })
  )
  .query(async ({ input }) => {
    const { user } = await authenticateUser(input.token);

    // Verify the show exists and belongs to the user's company
    const show = await db.show.findUnique({
      where: { id: input.showId },
    });

    if (!show || show.companyId !== user.companyId) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Show not found",
      });
    }

    // Fetch all character roles for the show with assigned actors
    const characterRoles = await db.characterRole.findMany({
      where: { showId: input.showId },
      include: {
        actorCharacters: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                profileImage: true,
              },
            },
          },
        },
      },
      orderBy: [
        { type: "asc" },
        { name: "asc" },
      ],
    });

    return {
      characterRoles: characterRoles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        type: role.type,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
        actors: role.actorCharacters.map((ac) => ({
          id: ac.id,
          userId: ac.userId,
          name: ac.user.name,
          email: ac.user.email,
          profileImage: ac.user.profileImage,
          notes: ac.notes,
        })),
      })),
    };
  });
