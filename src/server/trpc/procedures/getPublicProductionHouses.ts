import { z } from "zod";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";

export const getPublicProductionHouses = baseProcedure
  .input(z.object({}))
  .query(async () => {
    // Fetch all production houses from all companies for registration
    const productionHouses = await db.productionHouse.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
        _count: {
          select: { shows: true },
        },
      },
    });

    // Only return production houses from active companies
    return productionHouses
      .filter((ph) => ph.company.isActive)
      .map((ph) => ({
        id: ph.id,
        name: ph.name,
        description: ph.description,
        logoURL: ph.logoURL,
        showCount: ph._count.shows,
        companyId: ph.companyId,
        companyName: ph.company.name,
      }));
  });
