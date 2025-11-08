import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser } from "~/server/utils/auth";

export const createManualCallSheet = baseProcedure
  .input(
    z.object({
      token: z.string(),
      showId: z.number(),
      date: z.string(),
      location: z.string().optional(),
      scenesIncluded: z.string(), // JSON string
      crewList: z.string(), // JSON string
      actorList: z.string(), // JSON string
      notes: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const { user } = await authenticateUser(input.token);

    // Verify the show exists and belongs to the user's company
    const show = await db.show.findUnique({
      where: { id: input.showId },
    });

    if (!show) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Show not found",
      });
    }

    if (show.companyId !== user.companyId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have access to this show",
      });
    }

    // Validate JSON strings
    try {
      JSON.parse(input.scenesIncluded);
      JSON.parse(input.crewList);
      JSON.parse(input.actorList);
    } catch (error) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid JSON format for scenes, crew, or actors",
      });
    }

    // Create the call sheet record without PDF
    const callSheet = await db.callSheet.create({
      data: {
        companyId: user.companyId,
        showId: input.showId,
        date: new Date(input.date),
        location: input.location,
        scenesIncluded: input.scenesIncluded,
        crewList: input.crewList,
        actorList: input.actorList,
        notes: input.notes,
        pdfURL: null, // No PDF for manual call sheets
        createdBy: user.id,
      },
    });

    return {
      success: true,
      callSheet: {
        id: callSheet.id,
        date: callSheet.date,
        location: callSheet.location,
        notes: callSheet.notes,
      },
    };
  });
