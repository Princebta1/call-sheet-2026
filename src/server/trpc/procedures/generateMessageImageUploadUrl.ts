import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser, checkPermission } from "~/server/utils/auth";
import { minioClient, minioBaseUrl } from "~/server/minio";

export const generateMessageImageUploadUrl = baseProcedure
  .input(
    z.object({
      token: z.string(),
      fileExtension: z.string().regex(/^\.(jpg|jpeg|png|gif|webp)$/i, "Invalid file extension"),
      fileName: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    const { user, payload } = await authenticateUser(input.token);
    checkPermission(payload.permissions, "send_messages");

    // Generate unique filename with user ID and timestamp
    const timestamp = Date.now();
    const sanitizedFileName = input.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const objectName = `${user.id}-${timestamp}-${sanitizedFileName}`;
    const bucketName = "message-attachments";

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
      fileName: input.fileName,
    };
  });
