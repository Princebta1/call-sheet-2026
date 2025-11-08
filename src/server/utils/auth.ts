import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { env } from "~/server/env";
import { db } from "~/server/db";

export interface JWTPayload {
  userId: number;
  email: string;
  role: string;
  roleId: number | null;
  companyId: number;
  permissions: string[];
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET) as JWTPayload;
  } catch (error) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Invalid or expired token",
    });
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, 10);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

export async function authenticateUser(token: string) {
  const payload = verifyToken(token);
  
  const user = await db.user.findUnique({
    where: { id: payload.userId },
    include: { company: true },
  });

  if (!user || !user.isActive) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "User not found or inactive",
    });
  }

  return { user, payload };
}

export async function getUserPermissions(userId: number): Promise<string[]> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  if (!user || !user.role) {
    return [];
  }

  return user.role.rolePermissions.map((rp) => rp.permission.name);
}

export function checkPermission(
  permissions: string[],
  requiredPermission: string
): void {
  if (!permissions.includes(requiredPermission)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Insufficient permissions",
    });
  }
}

export function hasPermission(
  permissions: string[],
  requiredPermission: string
): boolean {
  return permissions.includes(requiredPermission);
}

export function canManageScenes(permissions: string[]): boolean {
  return hasPermission(permissions, "manage_scenes");
}

export function canManageTimers(permissions: string[]): boolean {
  return hasPermission(permissions, "manage_timers");
}

export function canMarkSceneComplete(permissions: string[]): boolean {
  return hasPermission(permissions, "mark_scene_complete");
}

export function canManageTeam(permissions: string[]): boolean {
  return hasPermission(permissions, "manage_team");
}
