# Feature 16: User Profile Management

## Goal

Allow users to view and manage their profile information including name, email, avatar, password, and account deletion.

## Status

Implemented. Branch: `2026-04-26/feature/profile-e2e-and-reactivation`

## Scope

In scope:

- View profile (`GET /auth/me`)
- Update profile (`PATCH /auth/profile`)
- Change password (`POST /auth/change-password`)
- Delete account (`DELETE /auth/account`) - soft delete
- Profile page UI with image upload/URL

Out of scope:

- Profile picture cropping/editing
- Account data export (GDPR)

**Note:** Account reactivation (`POST /auth/reactivate`) was added to scope and implemented.

## User Journeys

1. User navigates to `/profile` and sees their current info
2. User updates name → Save → Success message
3. User uploads avatar image → Preview → Save
4. User enters URL for avatar → Preview → Save
5. User changes password → Enter current + new → Success
6. User deletes account → Confirmation modal → Type "delete" → Account removed

## API Endpoints

| Method | Endpoint                | Description                         |
| ------ | ----------------------- | ----------------------------------- |
| GET    | `/auth/me`              | Returns current user with avatarUrl |
| PATCH  | `/auth/profile`         | Update name/email/avatarUrl         |
| POST   | `/auth/change-password` | Change password with verification   |
| DELETE | `/auth/account`         | Soft delete account                 |
| POST   | `/auth/reactivate`      | Reactivate a soft-deleted account   |

## Acceptance Criteria

- Profile page accessible from navbar at `/profile`
- Name and email can be updated
- Avatar can be set via file upload or URL
- Password change requires current password verification
- Delete account requires typing "delete" for confirmation
- Deleted accounts have all sessions revoked
- Deleted users cannot login
- Reactivated accounts can log in again with original email and password
- Email is preserved on delete (not mangled) to enable reactivation

## Backend Touchpoints

- `libs/server/auth/src/lib/auth.service.ts`
- `libs/server/auth/src/lib/auth.controller.ts`

## Frontend Touchpoints

- `apps/client/src/pages/profile.page.tsx`
- `libs/client/server-communication/src/lib/user.api.ts`
- `apps/client/src/components/navbar.tsx`

## Database Changes

```prisma
model User {
  // ... existing fields
  deleted    Boolean   @default(false)
  deletedAt  DateTime?
  avatarUrl  String?

  @@index([deleted])
}
```

## Validation Schemas

```typescript
// Profile update
export const updateProfileSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(2).max(50).optional(),
  avatarUrl: z.string().url().optional().nullable(),
});

// Password change
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8).max(100),
});

// Account reactivation
export const reactivateAccountSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
```

## Testing

- Unit tests for auth.service profile methods
- Unit tests for auth.controller profile endpoints
- API E2E tests in `apps/api-e2e/src/api/profile.spec.ts`
- Client E2E tests in `apps/client-e2e/src/profile.spec.ts`

## Implementation Order

1. ✅ Prisma schema + migration (`20260426200000_add_user_profile_and_soft_delete`)
2. ✅ Validation schemas (DTOs) — includes `reactivateAccountSchema`
3. ✅ Backend service + controller methods
4. ✅ Backend unit tests
5. ✅ Backend E2E tests (`apps/api-e2e/src/api/profile.spec.ts` — all passing)
6. ✅ Frontend API integration (`useReactivateAccountMutation`)
7. Frontend Redux store update
8. Frontend Profile page
9. Frontend router + navbar
10. Frontend unit tests
11. ✅ Frontend E2E tests (`apps/client-e2e/src/profile.spec.ts` — written, not yet run)

## Infrastructure Notes

- `apps/api-e2e/project.json`: removed `api:serve` from `dependsOn` (global-setup waits for port instead)
- `apps/api-e2e/jest.e2e.config.js`: renamed from `.cts` (jest couldn't load TypeScript config without ts-node preregistered); added `runInBand: true` via Nx executor option to prevent axios circular-reference serialization crashes in jest workers
