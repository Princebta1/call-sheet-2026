import { z } from "zod";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser } from "~/server/utils/auth";

export const getProductionHouses = baseProcedure
  .input(z.object({ token: z.string() }))
  .query(async ({ input }) => {
    const { user } = await authenticateUser(input.token);

    const productionHouses = await db.productionHouse.findMany({
      where: { companyId: user.companyId },
      orderBy: { createdAt: "desc" },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        parentProductionHouse: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: { shows: true },
        },
      },
    });

    return productionHouses.map((ph) => ({
      id: ph.id,
      name: ph.name,
      adminId: ph.adminId,
      admin: ph.admin,
      parentProductionHouseId: ph.parentProductionHouseId,
      parentProductionHouse: ph.parentProductionHouse,
      description: ph.description,
      logoURL: ph.logoURL,
      contactEmail: ph.contactEmail,
      contactPhone: ph.contactPhone,
      website: ph.website,
      address: ph.address,
      showCount: ph._count.shows,
      createdAt: ph.createdAt,
      updatedAt: ph.updatedAt,
    }));
  });
