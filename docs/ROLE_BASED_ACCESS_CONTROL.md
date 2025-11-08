# Role-Based Access Control (RBAC)

This document describes the role-based access control system implemented in the Call Sheet application.

## Overview

The application implements a comprehensive RBAC system that restricts access to pages, features, and API endpoints based on user roles. The system operates at two levels:

1. **Frontend (UI) Protection**: Controls what users see and can interact with
2. **Backend (API) Protection**: Enforces permissions at the data access layer

## Available Roles

The system provides the following built-in roles:

- **Developer**: Full system access, can manage all aspects including company approval
- **Admin**: Company administration, team management, and full production oversight
- **Actor**: Limited access, can view their assigned scenes and basic information

Companies can also create **custom roles** with specific permission combinations to match their organizational structure (e.g., "1st AD", "Producer", "Crew", etc.).

## Permission System

The application uses a granular permission system where users are assigned roles, and roles contain specific permissions. This allows companies to create custom roles tailored to their needs.

### System Roles

**Developer** - Has all permissions
**Admin** - Has all permissions except developer-specific features
**Actor** - Has limited view permissions: `view_scenes`, `edit_own_profile`, `view_shows`, `view_production_houses`, `view_announcements`

### Available Permissions

Permissions are organized by category:

**Scenes**: `manage_scenes`, `view_scenes`, `manage_timers`, `mark_scene_complete`
**Team**: `manage_team`, `view_team`, `edit_own_profile`
**Reports**: `manage_reports`, `view_reports`
**Shows**: `manage_shows`, `view_shows`
**Production Houses**: `manage_production_houses`, `view_production_houses`
**Company**: `manage_company`, `manage_roles`, `manage_recipient_groups`
**Communication**: `send_announcements`, `view_announcements`

## Permission System Architecture

### Frontend Permissions

The `usePermissions` hook (`src/hooks/usePermissions.ts`) provides centralized permission checking on the client side:

```typescript
import { usePermissions } from "~/hooks/usePermissions";

function MyComponent() {
  const permissions = usePermissions();
  
  if (permissions.canManageScenes()) {
    // Show scene management UI
  }
}
```

### Backend Permissions

Server-side permission checks should verify the user's role and its associated permissions:

```typescript
const userRole = await db.role.findUnique({
  where: { id: user.roleId ?? 0 },
  include: {
    rolePermissions: {
      include: {
        permission: true,
      },
    },
  },
});

const hasPermission = userRole?.rolePermissions.some(
  (rp) => rp.permission.name === "manage_scenes"
);

if (!hasPermission) {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "You don't have permission to manage scenes",
  });
}
```

### Route Protection

The `ProtectedRoute` component (`src/components/ProtectedRoute.tsx`) wraps pages to enforce access control:

```typescript
<ProtectedRoute
  requirePermission={(p) => p.canViewTeamPage()}
  accessDeniedMessage="Only administrators can access this page."
>
  <YourPageContent />
</ProtectedRoute>
```

## Page Access Matrix

| Page | Developer | Admin | Actor | Custom Roles* |
|------|-----------|-------|-------|---------------|
| Dashboard | ✅ | ✅ | ✅ | Based on permissions |
| Shows | ✅ | ✅ | ✅ | Based on permissions |
| Scenes | ✅ | ✅ | ✅** | Based on permissions |
| Calendar | ✅ | ✅ | ✅** | Based on permissions |
| Call Sheets | ✅ | ✅ | ✅ | Based on permissions |
| **Team** | ✅ | ✅ | ❌ | Requires "manage_team" permission |
| Actors | ✅ | ✅ | ✅ | Based on permissions |
| **Reports** | ✅ | ✅ | ❌ | Requires "view_reports" permission |
| Settings | ✅ | ✅ | ✅ | All users can access profile settings |

\* Custom roles' access is determined by their assigned permissions
\*\* Actors can only view scenes they are assigned to

## Feature Access Matrix

### Scene Management

| Feature | Required Permission |
|---------|-------------------|
| Create Scene | `manage_scenes` |
| Edit Scene | `manage_scenes` |
| Delete Scene | `manage_scenes` |
| View Scenes | `view_scenes` (Actors: assigned only) |
| Start/Stop Timer | `manage_timers` |
| Mark Complete | `mark_scene_complete` |

### Team Management

| Feature | Required Permission |
|---------|-------------------|
| View Team Page | `manage_team` |
| Invite Users | `manage_team` |
| Edit User Roles | `manage_team` |
| Remove Users | `manage_team` |
| Update User Status | `manage_team` |

### Show Management

| Feature | Required Permission |
|---------|-------------------|
| Create Show | `manage_shows` |
| Edit Show | `manage_shows` |
| View Shows | `view_shows` |

### Reports

| Feature | Required Permission |
|---------|-------------------|
| View Reports | `view_reports` |
| Generate Reports | `manage_reports` |

### Call Sheets

| Feature | Required Permission |
|---------|-------------------|
| View Call Sheets | All users |
| Generate Call Sheets | `manage_scenes` |

### Company Settings

| Feature | Required Permission |
|---------|-------------------|
| Update Company Info | `manage_company` |
| Manage Roles | `manage_roles` |
| Manage Recipient Groups | `manage_recipient_groups` |
| Update Profile | All (own profile only) |

## Permission Functions Reference

### Frontend (`usePermissions` hook)

The `usePermissions` hook provides permission checking based on the user's role and assigned permissions:

- `hasPermission(permissionName)` - Check if user has a specific permission
- `canManageScenes()` - Has `manage_scenes` permission
- `canManageTimers()` - Has `manage_timers` permission
- `canMarkSceneComplete()` - Has `mark_scene_complete` permission
- `canManageTeam()` - Has `manage_team` permission
- `canManageCompany()` - Has `manage_company` permission
- `canManageRoles()` - Has `manage_roles` permission
- `canManageReports()` - Has `manage_reports` permission
- `canInviteUsers()` - Has `manage_team` permission
- `canManageShows()` - Has `manage_shows` permission
- `canViewTeamPage()` - Has `manage_team` permission
- `canViewReportsPage()` - Has `view_reports` permission
- `canAccessRecipientGroups()` - Has `manage_recipient_groups` permission
- `isActor()` - Check if user has Actor role
- `isDeveloper()` - Check if user is a Developer
- `isAdmin()` - Check if user is an Admin

### Backend Permission Checking

Backend procedures should check permissions using the user's role and its associated permissions:

```typescript
const userRole = await db.role.findUnique({
  where: { id: user.roleId ?? 0 },
  include: {
    rolePermissions: {
      include: {
        permission: true,
      },
    },
  },
});

const hasPermission = userRole?.rolePermissions.some(
  (rp) => rp.permission.name === "manage_scenes"
);

if (!hasPermission) {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "You don't have permission to manage scenes",
  });
}
```

## Adding New Protected Features

### 1. Add Permission Function (if needed)

If your feature requires a new permission check, add it to the frontend hook:

**Frontend** (`src/hooks/usePermissions.ts`):
```typescript
const canDoNewThing = (): boolean => {
  return hasPermission("do_new_thing");
};
```

**Backend**: Check the permission directly in your procedure:
```typescript
const hasPermission = userRole?.rolePermissions.some(
  (rp) => rp.permission.name === "do_new_thing"
);

if (!hasPermission) {
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "You don't have permission to do this",
  });
}
```

### 2. Add the Permission to the Database

Add the new permission to the permissions array in `src/server/scripts/setup.ts`:

```typescript
const permissions = [
  // ... existing permissions
  { 
    name: "do_new_thing", 
    displayName: "Do New Thing", 
    description: "Can perform the new thing action", 
    category: "Features" 
  },
];
```

### 3. Protect the Page

Wrap your page component with `ProtectedRoute`:

```typescript
import { ProtectedRoute } from "~/components/ProtectedRoute";

function MyPage() {
  return (
    <ProtectedRoute
      requirePermission={(p) => p.canDoNewThing()}
      accessDeniedMessage="You don't have permission to access this feature."
    >
      <DashboardLayout>
        {/* Your page content */}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
```

### 4. Protect API Endpoints

In your tRPC procedure, check for the required permission:

```typescript
import { authenticateUser } from "~/server/utils/auth";

export const myProcedure = baseProcedure
  .input(z.object({ token: z.string() }))
  .mutation(async ({ input }) => {
    const { user } = await authenticateUser(input.token);
    
    // Get user's role and permissions
    const userRole = await db.role.findUnique({
      where: { id: user.roleId ?? 0 },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    const hasPermission = userRole?.rolePermissions.some(
      (rp) => rp.permission.name === "do_new_thing"
    );

    if (!hasPermission) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have permission to do this",
      });
    }
    
    // Your logic here
  });
```

### 5. Conditionally Render UI Elements

Use permission hooks to show/hide UI elements:

```typescript
const permissions = usePermissions();

return (
  <div>
    {permissions.canDoNewThing() && (
      <button>Do New Thing</button>
    )}
  </div>
);
```

### 6. Update Navigation (if adding a new page)

Update `src/components/DashboardLayout.tsx` to include the new page in navigation:

```typescript
const navigation = [
  // ... existing items
  { 
    name: "New Page", 
    href: "/new-page", 
    icon: SomeIcon, 
    requirePermission: () => permissions.canDoNewThing() 
  },
];
```

## Best Practices

1. **Always protect at both levels**: Frontend restrictions improve UX, but backend enforcement is mandatory for security
2. **Use permission functions**: Don't check roles directly; use the permission functions for consistency
3. **Fail securely**: When in doubt, restrict access
4. **Clear error messages**: Provide helpful feedback when access is denied
5. **Test all roles**: Ensure each role can access what they should and cannot access what they shouldn't
6. **Document changes**: Update this document when adding new permissions or roles

## Security Considerations

- **Frontend checks are not security**: They only improve UX by hiding unavailable features
- **Backend enforcement is mandatory**: All sensitive operations must be protected at the API level
- **Token validation**: Every API call validates the user's token and role
- **Inactive users**: Users with `isActive: false` are automatically denied access
- **Unapproved users**: Users with `approvedByAdmin: false` may have limited access

## Testing Permissions

To test different role permissions:

1. Create test users with different roles
2. Log in as each user type
3. Verify they can only access permitted pages and features
4. Attempt to access restricted API endpoints directly (should fail)
5. Check that navigation only shows permitted items

## Common Patterns

### Pattern 1: View-Only for Some Roles

```typescript
const permissions = usePermissions();
const canEdit = permissions.canManageScenes();

return (
  <div>
    {/* Everyone can view */}
    <SceneList scenes={scenes} />
    
    {/* Only users with manage_scenes permission can edit */}
    {canEdit && (
      <button onClick={handleEdit}>Edit Scene</button>
    )}
  </div>
);
```

### Pattern 2: Filtered Data Based on Role

```typescript
// Backend: Actors only see their assigned scenes
if (user.role?.name === "Actor") {
  scenes = scenes.filter(scene => 
    scene.assignedActors?.includes(user.id)
  );
}
```

### Pattern 3: Multiple Permission Checks

```typescript
const permissions = usePermissions();

// User needs BOTH permissions
if (permissions.canManageScenes() && permissions.canManageTeam()) {
  // Show advanced feature
}

// User needs ANY permission (admin or developer)
if (permissions.isAdmin() || permissions.isDeveloper()) {
  // Show admin feature
}
```

## Troubleshooting

### "Access Denied" when it shouldn't be

1. Check the user's role in the database
2. Verify the permission function includes the user's role
3. Check if the user is active (`isActive: true`)
4. Verify the token is valid and not expired

### Navigation item not showing

1. Check the `requirePermission` function in `DashboardLayout.tsx`
2. Verify the permission hook is returning the expected value
3. Check browser console for errors

### API call failing with FORBIDDEN

1. Verify the backend permission check includes the user's role
2. Check that the token is being passed correctly
3. Ensure `authenticateUser` is called before permission checks
