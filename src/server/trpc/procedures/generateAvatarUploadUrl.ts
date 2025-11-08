import { z } from "zod";
import { baseProcedure } from "~/server/trpc/main";
import { authenticateUser } from "~/server/utils/auth";
import { minioClient, minioBaseUrl } from "~/server/minio";

export const generateAvatarUploadUrl = baseProcedure
  .input(
    z.object({
      token: z.string(),
      fileExtension: z.string().regex(/^\.(jpg|jpeg|png|gif|webp)$/i, "Invalid file extension"),
    })
  )
  .mutation(async ({ input }) => {
    const { user } = await authenticateUser(input.token);

    // Generate unique filename with user ID and timestamp
    const timestamp = Date.now();
    const objectName = `public/avatars/${user.id}-${timestamp}${input.fileExtension}`;
    const bucketName = "avatars";

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
