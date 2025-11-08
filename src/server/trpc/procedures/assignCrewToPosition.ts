import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser, checkPermission } from "~/server/utils/auth";

export const assignCrewToPosition = baseProcedure
  .input(
    z.object({
      token: z.string(),
      userId: z.number(),
      showId: z.number(),
      departmentId: z.number(),
      positionId: z.number(),
      notes: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const { user, payload } = await authenticateUser(input.token);
    checkPermission(payload.permissions, "manage_team");

    // Verify the crew member exists and is in the same company
    const crewMember = await db.user.findUnique({
      where: { id: input.userId },
    });

    if (!crewMember || crewMember.companyId !== user.companyId) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    // Verify the show exists
    const show = await db.show.findUnique({
      where: { id: input.showId },
    });

    if (!show || show.companyId !== user.companyId) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Show not found",
      });
    }

    // Verify the department exists
    const department = await db.department.findUnique({
      where: { id: input.departmentId },
    });

    if (!department || department.companyId !== user.companyId) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Department not found",
      });
    }

    // Verify the position exists and belongs to the department
    const position = await db.position.findUnique({
      where: { id: input.positionId },
    });

    if (!position || position.departmentId !== input.departmentId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Position does not belong to the specified department",
      });
    }

    // Create the assignment (upsert to handle duplicates)
    const assignment = await db.crewAssignment.upsert({
      where: {
        userId_showId_departmentId_positionId: {
          userId: input.userId,
          showId: input.showId,
          departmentId: input.departmentId,
          positionId: input.positionId,
        },
      },
      create: {
        userId: input.userId,
        showId: input.showId,
        departmentId: input.departmentId,
        positionId: input.positionId,
        notes: input.notes,
      },
      update: {
        notes: input.notes,
      },
    });

    return { assignment };
  });
