import { db } from "~/server/db";

interface Scene {
  id: number;
  scheduledTime: Date | null;
  durationMinutes: number | null;
  assignedActors: string | null;
  assignedCrew: string | null;
  sceneNumber: string;
  title: string;
  showId: number;
}

interface ConflictInfo {
  sceneId: number;
  sceneNumber: string;
  sceneTitle: string;
  conflictType: "time" | "resource";
  conflictingSceneId: number;
  conflictingSceneNumber: string;
  conflictingSceneTitle: string;
  conflictingResources?: number[]; // User IDs of conflicting actors/crew
}

interface ConflictCheckResult {
  hasConflicts: boolean;
  conflicts: ConflictInfo[];
}

/**
 * Parse assigned actors or crew from JSON string
 */
function parseAssignedUsers(jsonString: string | null): number[] {
  if (!jsonString) return [];
  try {
    const parsed = JSON.parse(jsonString);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Check if two time ranges overlap
 */
function doTimeRangesOverlap(
  start1: Date,
  duration1: number,
  start2: Date,
  duration2: number
): boolean {
  const end1 = new Date(start1.getTime() + duration1 * 60000);
  const end2 = new Date(start2.getTime() + duration2 * 60000);
  
  // Two ranges overlap if one starts before the other ends
  return start1 < end2 && start2 < end1;
}

/**
 * Find common user IDs between two arrays
 */
function findCommonUsers(users1: number[], users2: number[]): number[] {
  return users1.filter(id => users2.includes(id));
}

/**
 * Detect conflicts for a specific scene against other scenes
 * @param sceneId - ID of the scene to check (can be null for new scenes)
 * @param scheduledTime - Scheduled time of the scene
 * @param durationMinutes - Duration of the scene in minutes (defaults to 60 if not provided)
 * @param assignedActors - Array of actor user IDs
 * @param assignedCrew - Array of crew user IDs
 * @param companyId - Company ID to scope the conflict check
 * @param showId - Optional show ID to limit conflict check to same show
 * @returns Conflict check result with details
 */
export async function detectSceneConflicts(
  sceneId: number | null,
  scheduledTime: Date,
  durationMinutes: number | null,
  assignedActors: number[],
  assignedCrew: number[],
  companyId: number,
  showId?: number
): Promise<ConflictCheckResult> {
  // Use 60 minutes as default duration if not specified
  const duration = durationMinutes || 60;
  
  // Get all scenes in the same company (optionally filtered by show)
  const whereClause: any = {
    companyId,
    scheduledTime: { not: null },
  };
  
  if (showId) {
    whereClause.showId = showId;
  }
  
  // Exclude the current scene if we're updating
  if (sceneId !== null) {
    whereClause.id = { not: sceneId };
  }
  
  const otherScenes = await db.scene.findMany({
    where: whereClause,
    select: {
      id: true,
      scheduledTime: true,
      durationMinutes: true,
      assignedActors: true,
      assignedCrew: true,
      sceneNumber: true,
      title: true,
      showId: true,
    },
  });
  
  const conflicts: ConflictInfo[] = [];
  const allAssignedUsers = [...assignedActors, ...assignedCrew];
  
  for (const otherScene of otherScenes) {
    if (!otherScene.scheduledTime) continue;
    
    const otherDuration = otherScene.durationMinutes || 60;
    const otherActors = parseAssignedUsers(otherScene.assignedActors);
    const otherCrew = parseAssignedUsers(otherScene.assignedCrew);
    const otherAllUsers = [...otherActors, ...otherCrew];
    
    // Check for time overlap
    const hasTimeOverlap = doTimeRangesOverlap(
      scheduledTime,
      duration,
      otherScene.scheduledTime,
      otherDuration
    );
    
    if (!hasTimeOverlap) continue;
    
    // Check for resource conflicts (common users)
    const conflictingUsers = findCommonUsers(allAssignedUsers, otherAllUsers);
    
    if (conflictingUsers.length > 0) {
      conflicts.push({
        sceneId: sceneId || 0,
        sceneNumber: "", // Will be filled by caller
        sceneTitle: "", // Will be filled by caller
        conflictType: "resource",
        conflictingSceneId: otherScene.id,
        conflictingSceneNumber: otherScene.sceneNumber,
        conflictingSceneTitle: otherScene.title,
        conflictingResources: conflictingUsers,
      });
    } else {
      // Time overlap without resource conflict (just a warning)
      conflicts.push({
        sceneId: sceneId || 0,
        sceneNumber: "",
        sceneTitle: "",
        conflictType: "time",
        conflictingSceneId: otherScene.id,
        conflictingSceneNumber: otherScene.sceneNumber,
        conflictingSceneTitle: otherScene.title,
      });
    }
  }
  
  return {
    hasConflicts: conflicts.length > 0,
    conflicts,
  };
}

/**
 * Get all conflicts for a set of scenes (useful for calendar view)
 * @param sceneIds - Array of scene IDs to check
 * @param companyId - Company ID
 * @returns Map of scene IDs to their conflicts
 */
export async function getConflictsForScenes(
  sceneIds: number[],
  companyId: number
): Promise<Map<number, ConflictInfo[]>> {
  const conflictMap = new Map<number, ConflictInfo[]>();
  
  if (sceneIds.length === 0) return conflictMap;
  
  // Get all scenes
  const scenes = await db.scene.findMany({
    where: {
      id: { in: sceneIds },
      companyId,
      scheduledTime: { not: null },
    },
    select: {
      id: true,
      scheduledTime: true,
      durationMinutes: true,
      assignedActors: true,
      assignedCrew: true,
      sceneNumber: true,
      title: true,
      showId: true,
    },
  });
  
  // Check each scene for conflicts
  for (const scene of scenes) {
    if (!scene.scheduledTime) continue;
    
    const actors = parseAssignedUsers(scene.assignedActors);
    const crew = parseAssignedUsers(scene.assignedCrew);
    
    const result = await detectSceneConflicts(
      scene.id,
      scene.scheduledTime,
      scene.durationMinutes,
      actors,
      crew,
      companyId,
      scene.showId
    );
    
    if (result.hasConflicts) {
      // Fill in the scene info for each conflict
      const conflictsWithInfo = result.conflicts.map(conflict => ({
        ...conflict,
        sceneId: scene.id,
        sceneNumber: scene.sceneNumber,
        sceneTitle: scene.title,
      }));
      conflictMap.set(scene.id, conflictsWithInfo);
    }
  }
  
  return conflictMap;
}
