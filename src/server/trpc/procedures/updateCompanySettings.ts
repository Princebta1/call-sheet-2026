import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser, checkPermission } from "~/server/utils/auth";

export const updateCompanySettings = baseProcedure
  .input(
    z.object({
      token: z.string(),
      name: z.string().min(1),
      email: z.string().email(),
      subscriptionTier: z.enum(["Basic", "Pro", "Enterprise"]).optional(),
    })
  )
  .mutation(async ({ input }) => {
    const { user, payload } = await authenticateUser(input.token);

    // Check if user has permission to manage company settings
    checkPermission(payload.permissions, "manage_company");

    // Only developers can change subscription tier
    if (input.subscriptionTier && payload.role !== "Developer") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only developers can modify subscription tier",
      });
    }

    // Check if the new email is already taken by another company
    if (input.email !== user.company.email) {
      const existingCompany = await db.company.findUnique({
        where: { email: input.email },
      });

      if (existingCompany && existingCompany.id !== user.companyId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A company with this email already exists",
        });
      }
    }

    // Update company
    const updatedCompany = await db.company.update({
      where: { id: user.companyId },
      data: {
        name: input.name,
        email: input.email,
        ...(input.subscriptionTier && { subscriptionTier: input.subscriptionTier }),
      },
    });

    return {
      id: updatedCompany.id,
      name: updatedCompany.name,
      email: updatedCompany.email,
      subscriptionTier: updatedCompany.subscriptionTier,
    };
  });
