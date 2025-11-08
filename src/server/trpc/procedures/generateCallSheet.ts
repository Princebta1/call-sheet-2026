import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser, canManageScenes } from "~/server/utils/auth";
import { minioClient, minioBaseUrl } from "~/server/minio";
import PDFDocument from "pdfkit";
import { Readable } from "stream";

export const generateCallSheet = baseProcedure
  .input(
    z.object({
      token: z.string(),
      showId: z.number(),
      date: z.string(), // ISO date string
      location: z.string().optional(),
      notes: z.string().optional(),
    })
  )
  .mutation(async ({ input }) => {
    const { user } = await authenticateUser(input.token);

    if (!canManageScenes(user.role)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have permission to generate call sheets",
      });
    }

    // Parse the date and get start/end of day
    const targetDate = new Date(input.date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Fetch scenes scheduled for this date and show
    const scenes = await db.scene.findMany({
      where: {
        companyId: user.companyId,
        showId: input.showId,
        scheduledTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: {
        scheduledTime: "asc",
      },
    });

    if (scenes.length === 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No scenes scheduled for this date",
      });
    }

    // Fetch show information
    const show = await db.show.findUnique({
      where: { id: input.showId },
    });

    if (!show) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Show not found",
      });
    }

    // Fetch all active users in the company
    const users = await db.user.findMany({
      where: {
        companyId: user.companyId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        role: true,
        phone: true,
        email: true,
      },
    });

    // Compile crew list (non-actors)
    const crewList = users
      .filter((u) => u.role !== "Actor")
      .map((u) => ({
        id: u.id,
        name: u.name,
        role: u.role,
        phone: u.phone,
        email: u.email,
      }));

    // Compile actor list from assigned actors in scenes
    const actorIds = new Set<number>();
    scenes.forEach((scene) => {
      if (scene.assignedActors) {
        try {
          const actors = JSON.parse(scene.assignedActors);
          actors.forEach((actorId: number) => actorIds.add(actorId));
        } catch {
          // Ignore parsing errors
        }
      }
    });

    const actorList = users
      .filter((u) => u.role === "Actor" && actorIds.has(u.id))
      .map((u) => ({
        id: u.id,
        name: u.name,
        phone: u.phone,
        email: u.email,
      }));

    // Generate PDF
    const doc = new PDFDocument({ margin: 50, size: "LETTER" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));

    // Header
    doc
      .fontSize(24)
      .font("Helvetica-Bold")
      .text("CALL SHEET", { align: "center" });
    doc.moveDown(0.5);

    // Show and Date Info
    doc.fontSize(16).font("Helvetica-Bold").text(show.title, { align: "center" });
    doc
      .fontSize(12)
      .font("Helvetica")
      .text(
        `Date: ${targetDate.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}`,
        { align: "center" }
      );
    
    if (input.location) {
      doc.text(`Location: ${input.location}`, { align: "center" });
    }

    doc.moveDown(1.5);
    doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
    doc.moveDown(1);

    // Scenes Section
    doc.fontSize(14).font("Helvetica-Bold").text("SCHEDULED SCENES");
    doc.moveDown(0.5);

    scenes.forEach((scene, index) => {
      const time = scene.scheduledTime
        ? new Date(scene.scheduledTime).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          })
        : "TBD";

      doc.fontSize(11).font("Helvetica-Bold").text(`Scene ${scene.sceneNumber}`, { continued: true });
      doc.font("Helvetica").text(` - ${time}`);
      doc.font("Helvetica").text(`Title: ${scene.title}`);
      
      if (scene.description) {
        doc.fontSize(10).text(`Description: ${scene.description}`);
      }
      
      if (scene.location) {
        doc.text(`Location: ${scene.location}`);
      }

      if (index < scenes.length - 1) {
        doc.moveDown(0.5);
      }
    });

    doc.moveDown(1.5);
    doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
    doc.moveDown(1);

    // Crew Section
    doc.fontSize(14).font("Helvetica-Bold").text("CREW");
    doc.moveDown(0.5);

    if (crewList.length > 0) {
      crewList.forEach((crew) => {
        doc.fontSize(10).font("Helvetica-Bold").text(crew.name, { continued: true });
        doc.font("Helvetica").text(` - ${crew.role}`);
        if (crew.phone) {
          doc.text(`Phone: ${crew.phone}`);
        }
      });
    } else {
      doc.fontSize(10).font("Helvetica").text("No crew assigned");
    }

    doc.moveDown(1.5);
    doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
    doc.moveDown(1);

    // Cast Section
    doc.fontSize(14).font("Helvetica-Bold").text("CAST");
    doc.moveDown(0.5);

    if (actorList.length > 0) {
      actorList.forEach((actor) => {
        doc.fontSize(10).font("Helvetica-Bold").text(actor.name);
        if (actor.phone) {
          doc.font("Helvetica").text(`Phone: ${actor.phone}`);
        }
      });
    } else {
      doc.fontSize(10).font("Helvetica").text("No actors assigned");
    }

    // Notes Section
    if (input.notes) {
      doc.moveDown(1.5);
      doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
      doc.moveDown(1);

      doc.fontSize(14).font("Helvetica-Bold").text("NOTES");
      doc.moveDown(0.5);
      doc.fontSize(10).font("Helvetica").text(input.notes);
    }

    // Footer
    doc.moveDown(2);
    doc
      .fontSize(8)
      .font("Helvetica")
      .text(`Generated on ${new Date().toLocaleString()}`, {
        align: "center",
      });

    doc.end();

    // Wait for PDF generation to complete
    await new Promise<void>((resolve) => {
      doc.on("end", () => resolve());
    });

    const pdfBuffer = Buffer.concat(chunks);

    // Upload to MinIO
    const bucketName = "call-sheets";
    const fileName = `callsheet-${show.id}-${targetDate.toISOString().split("T")[0]}-${Date.now()}.pdf`;

    await minioClient.putObject(
      bucketName,
      fileName,
      pdfBuffer,
      pdfBuffer.length,
      {
        "Content-Type": "application/pdf",
      }
    );

    const pdfURL = `${minioBaseUrl}/${bucketName}/${fileName}`;

    // Save call sheet to database
    const callSheet = await db.callSheet.create({
      data: {
        companyId: user.companyId,
        showId: input.showId,
        date: targetDate,
        location: input.location || null,
        scenesIncluded: JSON.stringify(
          scenes.map((s) => ({
            id: s.id,
            sceneNumber: s.sceneNumber,
            title: s.title,
            scheduledTime: s.scheduledTime,
          }))
        ),
        crewList: JSON.stringify(crewList),
        actorList: JSON.stringify(actorList),
        notes: input.notes || null,
        pdfURL,
        createdBy: user.id,
      },
    });

    return {
      id: callSheet.id,
      date: callSheet.date,
      location: callSheet.location,
      pdfURL: callSheet.pdfURL,
      scenesIncluded: callSheet.scenesIncluded,
      crewList: callSheet.crewList,
      actorList: callSheet.actorList,
      notes: callSheet.notes,
    };
  });
