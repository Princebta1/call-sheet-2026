import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser, checkPermission } from "~/server/utils/auth";

export const updateShow = baseProcedure
  .input(
    z.object({
      token: z.string(),
      showId: z.number(),
      title: z.string().min(1).optional(),
      productionHouseId: z.number(),
      thumbnailURL: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      startDate: z.string().nullable().optional(),
      endDate: z.string().nullable().optional(),
      status: z.enum(["Pre-Production", "Shooting", "Wrapped"]).optional(),
    })
  )
  .mutation(async ({ input }) => {
    const { user, payload } = await authenticateUser(input.token);
    checkPermission(payload.permissions, "manage_shows");

    // Verify the show exists and belongs to the user's company
    const existingShow = await db.show.findUnique({
      where: { id: input.showId },
    });

    if (!existingShow) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Show not found",
      });
    }

    if (existingShow.companyId !== user.companyId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have access to this show",
      });
    }

    // Verify that the production house belongs to the user's company
    if (input.productionHouseId) {
      const productionHouse = await db.productionHouse.findUnique({
        where: { id: input.productionHouseId },
      });

      if (!productionHouse) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Production house not found",
        });
      }

      if (productionHouse.companyId !== user.companyId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only assign shows to production houses within your company",
        });
      }
    }

    // Build update data object with only provided fields
    const updateData: any = {};
    
    if (input.title !== undefined) updateData.title = input.title;
    if (input.thumbnailURL !== undefined) updateData.thumbnailURL = input.thumbnailURL;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.status !== undefined) updateData.status = input.status;
    
    updateData.productionHouseId = input.productionHouseId;
    
    if (input.startDate !== undefined) {
      updateData.startDate = input.startDate ? new Date(input.startDate) : null;
    }
    
    if (input.endDate !== undefined) {
      updateData.endDate = input.endDate ? new Date(input.endDate) : null;
    }

    const show = await db.show.update({
      where: { id: input.showId },
      data: updateData,
    });

    return {
      id: show.id,
      title: show.title,
      productionHouseId: show.productionHouseId,
      thumbnailURL: show.thumbnailURL,
      description: show.description,
      status: show.status,
      startDate: show.startDate,
      endDate: show.endDate,
    };
  });
