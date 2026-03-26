import { z } from 'zod';

// ---------------------------------------------------------------------------
// User schemas
// ---------------------------------------------------------------------------

export const userSchema = z.object({
  id: z.number(),
  email: z.string().email('Invalid email address'),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be at most 50 characters'),
  createdAt: z.date().optional(),
});

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2).max(50),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100),
});

export const updateUserSchema = createUserSchema.partial();

// ---------------------------------------------------------------------------
// Auth schemas
// ---------------------------------------------------------------------------

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2).max(50),
  phone: z.string().optional(),
});

export const forgotPasswordRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20, 'Invalid reset token'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100),
});

export const authResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  tokenType: z.enum(['Bearer']),
  expiresIn: z.number(),
  user: userSchema,
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

// ---------------------------------------------------------------------------
// Pagination schema
// ---------------------------------------------------------------------------

export const paginationQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
});

// ---------------------------------------------------------------------------
// Common response schemas
// ---------------------------------------------------------------------------

export const messageResponseSchema = z.object({
  message: z.string(),
});

export const successResponseSchema = z.object({
  success: z.literal(true),
});

export const errorResponseSchema = z.object({
  statusCode: z.number(),
  message: z.string(),
  error: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Poll schemas
// ---------------------------------------------------------------------------

export const pollStatusSchema = z.enum(['DRAFT', 'OPEN', 'CLOSED']);

export const pollVisibilitySchema = z.enum([
  'PRIVATE',
  'TRANSPARENT',
  'ANONYMOUS',
]);

export const createPollSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be at most 200 characters'),
  description: z
    .string()
    .max(1000, 'Description must be at most 1000 characters')
    .optional(),
  options: z
    .array(
      z.object({
        text: z
          .string()
          .min(1, 'Option text is required')
          .max(100, 'Option text must be at most 100 characters'),
      }),
    )
    .min(2, 'Poll must have at least 2 options')
    .max(10, 'Poll can have at most 10 options'),
  visibilityMode: pollVisibilitySchema.default('TRANSPARENT'),
  allowMultipleAnswers: z.boolean().default(false),
  themeIds: z
    .array(z.string().uuid())
    .min(1, 'At least one theme is required')
    .optional(),
});

export const updatePollSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be at most 200 characters')
    .optional(),
  description: z
    .string()
    .max(1000, 'Description must be at most 1000 characters')
    .optional(),
  options: z
    .array(
      z.object({
        id: z.number(),
        text: z
          .string()
          .min(1, 'Option text is required')
          .max(100, 'Option text must be at most 100 characters'),
      }),
    )
    .min(2, 'Poll must have at least 2 options')
    .max(10, 'Poll can have at most 10 options')
    .optional(),
  visibilityMode: pollVisibilitySchema.optional(),
  allowMultipleAnswers: z.boolean().optional(),
});

export const closePollSchema = z.object({}).passthrough();

export const pollResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  ownerId: z.number(),
  status: pollStatusSchema,
  visibilityMode: pollVisibilitySchema,
  allowMultipleAnswers: z.boolean(),
  openedAt: z.date().nullable(),
  closedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  options: z
    .array(
      z.object({
        id: z.number(),
        text: z.string(),
        voteCount: z.number(),
      }),
    )
    .min(2),
  themes: z.array(
    z.object({ id: z.string(), name: z.string(), slug: z.string() }),
  ),
});

// ---------------------------------------------------------------------------
// Theme schemas
// ---------------------------------------------------------------------------

export const createThemeSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(50, 'Name must be at most 50 characters'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(50, 'Slug must be at most 50 characters'),
  description: z
    .string()
    .max(500, 'Description must be at most 500 characters')
    .optional(),
});

export const themeResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ---------------------------------------------------------------------------
// Vote schemas
// ---------------------------------------------------------------------------

export const castVoteSchema = z.object({
  optionId: z.number().int().positive('Option ID must be a positive number'),
});

export const voteResponseSchema = z.object({
  id: z.string(),
  pollId: z.string(),
  optionId: z.number(),
  optionText: z.string(),
  optionVoteCount: z.number(),
  pollStatus: pollStatusSchema,
});

// ---------------------------------------------------------------------------
// Namespace exports for convenient grouped imports
// ---------------------------------------------------------------------------

export const UserSchemas = {
  user: userSchema,
  create: createUserSchema,
  update: updateUserSchema,
} as const;

export const AuthSchemas = {
  login: loginSchema,
  register: registerSchema,
  forgotPasswordRequest: forgotPasswordRequestSchema,
  resetPassword: resetPasswordSchema,
  response: authResponseSchema,
  refresh: refreshTokenSchema,
} as const;

export const CommonSchemas = {
  messageResponse: messageResponseSchema,
  successResponse: successResponseSchema,
  paginationQuery: paginationQuerySchema,
  errorResponse: errorResponseSchema,
} as const;

export const PollSchemas = {
  create: createPollSchema,
  update: updatePollSchema,
  close: closePollSchema,
  response: pollResponseSchema,
  status: pollStatusSchema,
  visibility: pollVisibilitySchema,
} as const;

export const ThemeSchemas = {
  create: createThemeSchema,
  response: themeResponseSchema,
} as const;

export const VoteSchemas = {
  cast: castVoteSchema,
  response: voteResponseSchema,
} as const;
