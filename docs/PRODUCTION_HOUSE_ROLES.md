# Production House Role Management

## Overview

The Production House Role Management system allows companies to manage user access and permissions at the production house level. This provides granular control over who can access specific production houses and what actions they can perform within them.

## Key Concepts

### Company-Wide vs Production House Roles

- **Company-Wide Roles**: Users have a primary role that applies across the entire company (e.g., Admin, Manager, Viewer)
- **Production House Roles**: Users can be assigned different roles for specific production houses, allowing them to have different permission levels in different contexts

### Example Scenario

A user might be:
- A **Manager** at the company level (can manage all company resources)
- A **Manager** in Production House A (full access to Production House A)
- A **Viewer** in Production House B (read-only access to Production House B)
- Not a member of Production House C (no access at all)

## Database Schema

### ProductionHouseMember Model

```prisma
model ProductionHouseMember {
  id                Int      @id @default(autoincrement())
  productionHouseId Int
  userId            Int
  roleId            Int?     // Role specific to this production house
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  productionHouse   ProductionHouse @relation(fields: [productionHouseId], references: [id], onDelete: Cascade)
  user              User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  role              Role?           @relation(fields: [roleId], references: [id], onDelete: SetNull)

  @@unique([productionHouseId, userId])
}
```

## Backend Procedures

### getProductionHouseMembers

Fetches all members of a specific production house with their roles and permissions.

**Input:**
- `token`: Authentication token
- `productionHouseId`: ID of the production house

**Output:**
- `productionHouse`: Basic production house info
- `members`: Array of members with user details, role, and permissions

### addProductionHouseMember

Adds a user to a production house with a specific role.

**Input:**
- `token`: Authentication token
- `productionHouseId`: ID of the production house
- `userId`: ID of the user to add
- `roleId`: ID of the role to assign

**Requirements:**
- User must have `manage_team` permission
- Target user must be in the same company
- User cannot already be a member of the production house

### updateProductionHouseMemberRole

Updates a member's role within a production house.

**Input:**
- `token`: Authentication token
- `memberId`: ID of the production house member record
- `roleId`: New role ID

**Requirements:**
- User must have `manage_team` permission
- Cannot change your own role (security measure)
- Role must be available to the company

### removeProductionHouseMember

Removes a user from a production house.

**Input:**
- `token`: Authentication token
- `memberId`: ID of the production house member record

**Requirements:**
- User must have `manage_team` permission
- Cannot remove yourself (security measure)

## Frontend Components

### ProductionHouseMemberManagement

Main component for managing production house team members.

**Features:**
- Display list of all members with their roles
- Search and filter functionality
- Statistics overview (total members, active members)
- Add new members with role assignment
- Update member roles via dropdown
- Remove members from production house
- Prevent users from modifying their own role

**Usage:**
```tsx
<ProductionHouseMemberManagement
  productionHouseId={123}
  productionHouseName="Acme Productions"
/>
```

### AddMemberModal

Modal component for adding new members to a production house.

**Features:**
- Select from company users who aren't already members
- Assign a role during the addition process
- Validation and error handling
- Disabled state when no users are available

## Routes

### /production-houses/:productionHouseId/team

Dedicated page for managing production house team members.

**Features:**
- Breadcrumb navigation
- Permission checks (requires `manage_team`)
- Integration with ProductionHouseMemberManagement component
- Error states for missing production houses

## Permission Requirements

To manage production house members, users must have:
- `manage_team` permission at the company level

## User Workflow

### Adding a Member

1. Navigate to Production House → Team tab
2. Click "Add Member" button
3. Select a user from the dropdown (shows only company users who aren't already members)
4. Select a role for the user
5. Click "Add Member"
6. User is now a member with the assigned role

### Updating a Member's Role

1. Navigate to Production House → Team tab
2. Find the member in the table
3. Use the "Assign Role" dropdown to select a new role
4. Role is updated immediately
5. Member's permissions are updated based on the new role

### Removing a Member

1. Navigate to Production House → Team tab
2. Find the member in the table
3. Click the "Remove" button
4. Confirm the removal
5. Member loses access to the production house

## Security Considerations

### Self-Modification Prevention

Users cannot:
- Change their own role within a production house
- Remove themselves from a production house

This prevents accidental lockouts and ensures proper access control.

### Company Scope

All operations are scoped to the user's company:
- Can only add users from the same company
- Can only use roles available to the company
- Cannot access production houses from other companies

### Permission Inheritance

Production house roles use the same permission system as company-wide roles:
- Roles can be system roles (Developer, Admin, Manager, etc.)
- Roles can be custom roles created by the company
- Permissions are enforced at the procedure level

## Future Enhancements

Potential improvements for the production house role system:

1. **Context-Aware Permissions**: Automatically check production house membership when accessing production house resources
2. **Role Templates**: Pre-defined role sets for common production house scenarios
3. **Bulk Member Management**: Add multiple users at once with the same role
4. **Member Activity Tracking**: Track when members last accessed a production house
5. **Invitation System**: Send invitations to users to join production houses
6. **Production House-Specific Permissions**: Create permissions that only apply within production house contexts

## Troubleshooting

### User can't see the Team tab

**Cause**: User doesn't have `manage_team` permission

**Solution**: Assign a role with `manage_team` permission to the user

### Can't add a user to production house

**Possible Causes:**
1. User is already a member
2. User is not in the same company
3. You don't have `manage_team` permission

**Solution**: Verify the user's membership status and your permissions

### Role dropdown is empty

**Cause**: No roles are available to the company

**Solution**: Create custom roles or ensure system roles are properly seeded in the database

## Related Documentation

- [Role-Based Access Control](./ROLE_BASED_ACCESS_CONTROL.md)
- [User Roles Guide](./USER_ROLES_GUIDE.md)
- [Role Testing](./ROLE_TESTING.md)
