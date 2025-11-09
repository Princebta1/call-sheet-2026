import { z } from "zod";

// Load environment variables from .env file (Node 20.6+)
try {
  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile();
  }
} catch (error) {
  // .env file may not exist, which is okay if env vars are set another way
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]),
  BASE_URL: z.string().optional(),
  BASE_URL_OTHER_PORT: z.string().optional(),
  ADMIN_PASSWORD: z.string(),
  JWT_SECRET: z.string(),
  RESEND_API_KEY: z.string(),
  FROM_EMAIL: z.string().email(),
});

export const env = envSchema.parse(process.env);
