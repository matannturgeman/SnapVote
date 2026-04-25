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

export const pollOptionSchema = z.object({
  id: z.string(),
  text: z.string().min(1).max(200),
  order: z.number().int().nonnegative(),
});

export const pollSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  status: pollStatusSchema,
  ownerId: z.number().int(),
  openedAt: z.date().nullable().optional(),
  closedAt: z.date().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  options: z.array(pollOptionSchema).min(1),
  totalVotes: z.number().int().nonnegative().optional(),
});

export const pollListQuerySchema = z.object({
  status: pollStatusSchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const createPollSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  options: z
    .array(z.string().min(1, 'Option text is required').max(200))
    .min(2, 'At least 2 options are required')
    .max(10, 'At most 10 options are allowed'),
});

export const updatePollSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200).optional(),
  description: z.string().max(1000).optional(),
  options: z
    .array(z.string().min(1, 'Option text is required').max(200))
    .min(2, 'At least 2 options are required')
    .max(10, 'At most 10 options are allowed')
    .optional(),
});

export const shareLinkStatusSchema = z.enum(['ACTIVE', 'REVOKED']);

export const shareLinkSchema = z.object({
  id: z.string(),
  pollId: z.string(),
  token: z.string(),
  status: shareLinkStatusSchema,
  expiresAt: z.date().nullable().optional(),
  createdAt: z.date(),
});

export const createShareLinkSchema = z.object({
  expiresAt: z.date().optional(),
});

export const joinPollResponseSchema = z.object({
  poll: z.lazy(() => pollSchema),
  shareLink: shareLinkSchema,
});

export const castVoteSchema = z.object({
  optionId: z.string().min(1, 'Option ID is required'),
});

export const voteOptionResultSchema = z.object({
  id: z.string(),
  text: z.string(),
  order: z.number().int().nonnegative(),
  voteCount: z.number().int().nonnegative(),
});

export const pollResultsSchema = z.object({
  pollId: z.string(),
  totalVotes: z.number().int().nonnegative(),
  options: z.array(voteOptionResultSchema),
  myVote: z.object({ optionId: z.string() }).nullable(),
});

// ---------------------------------------------------------------------------
// Poll stream event schemas (SSE)
// ---------------------------------------------------------------------------

export const pollStreamResultsEventSchema = z.object({
  type: z.literal('results'),
  data: pollResultsSchema,
});

export const pollStreamPresenceEventSchema = z.object({
  type: z.literal('presence'),
  data: z.object({ count: z.number().int().nonnegative() }),
});

export const pollStreamClosedEventSchema = z.object({
  type: z.literal('closed'),
  data: z.object({ pollId: z.string() }),
});

export const pollStreamEventSchema = z.discriminatedUnion('type', [
  pollStreamResultsEventSchema,
  pollStreamPresenceEventSchema,
  pollStreamClosedEventSchema,
]);

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
  pollStatus: pollStatusSchema,
  pollOption: pollOptionSchema,
  poll: pollSchema,
  create: createPollSchema,
  update: updatePollSchema,
  pollListQuery: pollListQuerySchema,
  shareLinkStatus: shareLinkStatusSchema,
  shareLink: shareLinkSchema,
  createShareLink: createShareLinkSchema,
  joinPollResponse: joinPollResponseSchema,
  castVote: castVoteSchema,
  voteOptionResult: voteOptionResultSchema,
  pollResults: pollResultsSchema,
  streamResultsEvent: pollStreamResultsEventSchema,
  streamPresenceEvent: pollStreamPresenceEventSchema,
  streamClosedEvent: pollStreamClosedEventSchema,
  streamEvent: pollStreamEventSchema,
} as const;

// ---------------------------------------------------------------------------
// Moderation schemas
// ---------------------------------------------------------------------------

export const reportReasonSchema = z.enum([
  'SPAM',
  'HARASSMENT',
  'INAPPROPRIATE',
  'DUPLICATE',
]);

export const reportStatusSchema = z.enum([
  'PENDING',
  'REVIEWED',
  'DISMISSED',
  'ACTION_TAKEN',
]);

export const createReportSchema = z.object({
  reason: reportReasonSchema,
  details: z
    .string()
    .min(1)
    .max(1000, 'Details must be at most 1000 characters')
    .optional(),
  voteId: z.string().optional(),
});

export const moderationActionSchema = z.enum([
  'LOCK',
  'UNLOCK',
  'DELETE',
  'REMOVE_REPORT',
]);
