import { z } from 'zod';
import {
  userSchema,
  createUserSchema,
  updateProfileSchema,
  changePasswordSchema,
  loginSchema,
  registerSchema,
  forgotPasswordRequestSchema,
  resetPasswordSchema,
  reactivateAccountSchema,
  authResponseSchema,
  messageResponseSchema,
  successResponseSchema,
  pollSchema,
  pollOptionSchema,
  pollVisibilityModeSchema,
  createPollSchema,
  updatePollSchema,
  pollListQuerySchema,
  shareLinkSchema,
  createShareLinkSchema,
  joinPollResponseSchema,
  castVoteSchema,
  pollResultsSchema,
  pollStreamEventSchema,
  createReportSchema,
  reportReasonSchema,
  reportStatusSchema,
  moderationActionSchema,
} from '@libs/shared-validation-schemas';

// ---------------------------------------------------------------------------
// User DTOs
// ---------------------------------------------------------------------------

export const CreateUserDtoSchema = createUserSchema;
export const UpdateUserDtoSchema = userSchema
  .omit({ id: true, createdAt: true })
  .partial();
export const UserResponseDtoSchema = userSchema;

export type CreateUserDto = z.infer<typeof CreateUserDtoSchema>;
export type UpdateUserDto = z.infer<typeof UpdateUserDtoSchema>;
export type UserResponseDto = z.infer<typeof UserResponseDtoSchema>;

// ---------------------------------------------------------------------------
// Auth DTOs
// ---------------------------------------------------------------------------

export const LoginDtoSchema = loginSchema;
export const RegisterDtoSchema = registerSchema;
export const ForgotPasswordRequestDtoSchema = forgotPasswordRequestSchema;
export const ResetPasswordDtoSchema = resetPasswordSchema;
export const AuthResponseDtoSchema = authResponseSchema;
export const UpdateProfileDtoSchema = updateProfileSchema;
export const ChangePasswordDtoSchema = changePasswordSchema;
export const ReactivateAccountDtoSchema = reactivateAccountSchema;

export type LoginDto = z.infer<typeof LoginDtoSchema>;
export type RegisterDto = z.infer<typeof RegisterDtoSchema>;
export type ForgotPasswordRequestDto = z.infer<
  typeof ForgotPasswordRequestDtoSchema
>;
export type ResetPasswordDto = z.infer<typeof ResetPasswordDtoSchema>;
export type AuthResponseDto = z.infer<typeof AuthResponseDtoSchema>;
export type UpdateProfileDto = z.infer<typeof UpdateProfileDtoSchema>;
export type ChangePasswordDto = z.infer<typeof ChangePasswordDtoSchema>;
export type ReactivateAccountDto = z.infer<typeof ReactivateAccountDtoSchema>;

// ---------------------------------------------------------------------------
// Common response DTOs
// ---------------------------------------------------------------------------

export const MessageResponseDtoSchema = messageResponseSchema;
export const SuccessResponseDtoSchema = successResponseSchema;

export type MessageResponseDto = z.infer<typeof MessageResponseDtoSchema>;
export type SuccessResponseDto = z.infer<typeof SuccessResponseDtoSchema>;

// ---------------------------------------------------------------------------
// Pagination DTOs
// ---------------------------------------------------------------------------

export const PaginationQueryDtoSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const PaginatedResponseDtoSchema = <T extends z.ZodTypeAny>(
  itemSchema: T,
) =>
  z.object({
    data: z.array(itemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
  });

export type PaginationQueryDto = z.infer<typeof PaginationQueryDtoSchema>;
export type PaginatedResponseDto<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

// ---------------------------------------------------------------------------
// Poll DTOs
// ---------------------------------------------------------------------------

export const PollOptionResponseDtoSchema = pollOptionSchema;
export const PollVisibilityModeDtoSchema = pollVisibilityModeSchema;
export const PollResponseDtoSchema = pollSchema;
export const CreatePollDtoSchema = createPollSchema;
export const UpdatePollDtoSchema = updatePollSchema;
export const PollListQueryDtoSchema = pollListQuerySchema;
export const ShareLinkResponseDtoSchema = shareLinkSchema;
export const CreateShareLinkDtoSchema = createShareLinkSchema;
export const JoinPollResponseDtoSchema = joinPollResponseSchema;
export const CastVoteDtoSchema = castVoteSchema;
export const PollResultsDtoSchema = pollResultsSchema;
export const PollStreamEventDtoSchema = pollStreamEventSchema;

export const CreateReportDtoSchema = createReportSchema;
export const ReportReasonDtoSchema = reportReasonSchema;
export const ReportStatusDtoSchema = reportStatusSchema;
export const ModerationActionDtoSchema = moderationActionSchema;

export type PollOptionResponseDto = z.infer<typeof PollOptionResponseDtoSchema>;
export type PollVisibilityMode = z.infer<typeof PollVisibilityModeDtoSchema>;
export type PollResponseDto = z.infer<typeof PollResponseDtoSchema>;
export type CreatePollDto = z.infer<typeof CreatePollDtoSchema>;
export type UpdatePollDto = z.infer<typeof UpdatePollDtoSchema>;
export type PollListQueryDto = z.infer<typeof PollListQueryDtoSchema>;
export type ShareLinkResponseDto = z.infer<typeof ShareLinkResponseDtoSchema>;
export type CreateShareLinkDto = z.infer<typeof CreateShareLinkDtoSchema>;
export type JoinPollResponseDto = z.infer<typeof JoinPollResponseDtoSchema>;
export type CastVoteDto = z.infer<typeof CastVoteDtoSchema>;
export type PollResultsDto = z.infer<typeof PollResultsDtoSchema>;
export type PollStreamEventDto = z.infer<typeof PollStreamEventDtoSchema>;
export type CreateReportDto = z.infer<typeof CreateReportDtoSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse and validate an unknown value against a DTO schema.
 * Throws a ZodError on invalid input.
 *
 * @example
 * const dto = parseDto(LoginDtoSchema, req.body);
 */
export function parseDto<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
): z.infer<T> {
  return schema.parse(data);
}

/**
 * Safe-parse an unknown value against a DTO schema.
 * Returns a Zod safe-parse result - never throws.
 */
export function safeParsDto<T extends z.ZodTypeAny>(schema: T, data: unknown) {
  // Return type intentionally inferred - Zod v4's safeParse generics are
  // complex and an explicit annotation causes TS2322 under strict mode.
  return schema.safeParse(data);
}
