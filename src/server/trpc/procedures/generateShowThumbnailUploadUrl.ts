import { z } from "zod";
import { minioClient, MINIO_BUCKET } from "~/server/minio";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser } from "~/server/utils/auth";
import { getMinioBaseUrl } from "~/server/utils/base-url";

export const generateShowThumbnailUploadUrl = baseProcedure
  .input(
    z.object({
      token: z.string(),
      showId: z.number(),
      fileExtension: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const { user, payload } = await authenticateUser(input.token);

    // Check if user has permission to manage shows
    if (!payload.permissions.includes("manage_shows")) {
      throw new Error("You don't have permission to upload show thumbnails");
    }

    // Generate a unique filename
    const timestamp = Date.now();
    const filename = `show-thumbnails/${input.showId}-${timestamp}.${input.fileExtension}`;

    // Generate pre-signed URL for upload (valid for 5 minutes)
    const uploadUrl = await minioClient.presignedPutObject(
      MINIO_BUCKET,
      filename,
      5 * 60
    );

    // Construct the public URL that will be used to access the file
    const baseUrl = getMinioBaseUrl();
    const publicUrl = `${baseUrl}/${MINIO_BUCKET}/${filename}`;

    return {
      uploadUrl,
      publicUrl,
    };
  });
