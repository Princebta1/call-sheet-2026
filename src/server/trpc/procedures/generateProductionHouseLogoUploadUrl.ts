import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser, checkPermission } from "~/server/utils/auth";
import { minioClient, minioBaseUrl } from "~/server/minio";

export const generateProductionHouseLogoUploadUrl = baseProcedure
  .input(
    z.object({
      token: z.string(),
      fileExtension: z.string().regex(/^\.(jpg|jpeg|png|gif|webp|svg)$/i, "Invalid file extension"),
    })
  )
  .mutation(async ({ input }) => {
    const { user, payload } = await authenticateUser(input.token);
    checkPermission(payload.permissions, "manage_production_houses");

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const objectName = `logos/${user.companyId}-${timestamp}${input.fileExtension}`;
    const bucketName = "production-house-logos";

    // Generate presigned URL (valid for 5 minutes)
    const presignedUrl = await minioClient.presignedPutObject(
      bucketName,
      objectName,
      5 * 60 // 5 minutes
    );

    // Construct the final public URL that will be used after upload
    const publicUrl = `${minioBaseUrl}/${bucketName}/${objectName}`;

    return {
      presignedUrl,
      publicUrl,
      objectName,
    };
  });
