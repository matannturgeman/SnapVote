import { baseApi } from './base-api';
import type {
  CreatePollDto,
  UpdatePollDto,
  PollResponseDto,
  PaginatedResponseDto,
  PaginationQueryDto,
  CastVoteDto,
  VoteResponseDto,
  ThemeResponseDto,
} from '@libs/shared-dto';

// ---------------------------------------------------------------------------
// Polls API slice — injected into baseApi
// ---------------------------------------------------------------------------

/**
 * Poll CRUD and voting endpoints injected into the root `baseApi`.
 *
 * Provides hooks for:
 *  - `useCreatePollMutation`      — POST   /polls
 *  - `useGetPollQuery`            — GET    /polls/:id
 *  - `useLazyGetPollQuery`        — same as above but fires only when called
 *  - `useUpdatePollMutation`      — PATCH  /polls/:id
 *  - `useClosePollMutation`       — POST   /polls/:id/close
 *  - `useDeletePollMutation`      — DELETE /polls/:id
 *  - `useListPollsQuery`          — GET    /polls (with filters)
 *  - `useLazyListPollsQuery`      — same as above but fires only when called
 *  - `useCastVoteMutation`        — POST   /polls/:id/votes
 *  - `useGetUserVoteQuery`        — GET    /polls/:id/votes/me
 *  - `useRemoveVoteMutation`      — DELETE /polls/:id/votes/me
 *  - `useListThemesQuery`         — GET    /themes
 *
 * ### Cache invalidation strategy
 * - Individual poll queries are tagged `{ type: 'Poll', id }`.
 * - The list query is tagged `{ type: 'Poll', id: 'LIST' }`.
 * - Create invalidates the whole list so the new entry appears.
 * - Update/Delete invalidate the individual item tag AND the list.
 * - Vote mutations invalidate both the poll and the list to reflect updated counts.
 *
 * ### Usage example
 * ```tsx
 * import {
 *   useCreatePollMutation,
 *   useListPollsQuery,
 *   useCastVoteMutation,
 * } from '@libs/client-server-communication';
 *
 * function PollCreator() {
 *   const [createPoll, { isLoading }] = useCreatePollMutation();
 *   const { data: polls } = useListPollsQuery({ page: 1, limit: 20 });
 *
 *   const onSubmit = async (formData) => {
 *     await createPoll(formData).unwrap();
 *   };
 *
 *   return (
 *     <button onClick={onSubmit} disabled={isLoading}>Create</button>
 *   );
 * }
 * ```
 */
export const pollsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // ── POST /polls ────────────────────────────────────────────────────────
    /**
     * Creates a new poll. The authenticated user becomes the owner.
     *
     * @example
     * const [createPoll, { isLoading }] = useCreatePollMutation();
     * await createPoll({
     *   title: "What's for lunch?",
     *   options: [{ text: "Pizza" }, { text: "Burgers" }],
     *   visibilityMode: "TRANSPARENT",
     *   allowMultipleAnswers: false,
     *   themeIds: ["theme-uuid-1"]
     * }).unwrap();
     */
    createPoll: build.mutation<PollResponseDto, CreatePollDto>({
      query: (body) => ({
        url: '/polls',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Poll' as const, id: 'LIST' }],
    }),

    // ── GET /polls/:id ─────────────────────────────────────────────────────
    /**
     * Fetches a single poll by ID with full details including options and themes.
     *
     * The poll must be accessible to the authenticated user based on visibility rules.
     *
     * @example
     * const { data: poll, isLoading } = useGetPollQuery({ pollId: "abc123" });
     */
    getPoll: build.query<PollResponseDto, { pollId: string }>({
      query: ({ pollId }) => `/polls/${pollId}`,
      providesTags: (_result, _error, { pollId }) => [{ type: 'Poll' as const, id: pollId }],
    }),

    // ── PATCH /polls/:id ───────────────────────────────────────────────────
    /**
     * Updates a poll. Only the owner can update, and only while in DRAFT status.
     *
     * @example
     * const [updatePoll, { isLoading }] = useUpdatePollMutation();
     * await updatePoll({
     *   pollId: "abc123",
     *   body: { title: "Updated title?" }
     * }).unwrap();
     */
    updatePoll: build.mutation<PollResponseDto, { pollId: string; body: UpdatePollDto }>({
      query: ({ pollId, body }) => ({
        url: `/polls/${pollId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { pollId }) => [
        { type: 'Poll' as const, id: pollId },
        { type: 'Poll' as const, id: 'LIST' },
      ],
    }),

    // ── POST /polls/:id/close ───────────────────────────────────────────────
    /**
     * Closes an open poll. Only the owner can close.
     *
     * @example
     * const [closePoll, { isLoading }] = useClosePollMutation();
     * await closePoll({ pollId: "abc123" }).unwrap();
     */
    closePoll: build.mutation<PollResponseDto, { pollId: string }>({
      query: ({ pollId }) => ({
        url: `/polls/${pollId}/close`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { pollId }) => [
        { type: 'Poll' as const, id: pollId },
        { type: 'Poll' as const, id: 'LIST' },
      ],
    }),

    // ── DELETE /polls/:id ───────────────────────────────────────────────────
    /**
     * Soft-deletes a poll. Only the owner can delete.
     *
     * @example
     * const [deletePoll, { isLoading }] = useDeletePollMutation();
     * await deletePoll("abc123").unwrap();
     */
    deletePoll: build.mutation<void, string>({
      query: (pollId) => ({
        url: `/polls/${pollId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, pollId) => [
        { type: 'Poll' as const, id: pollId },
        { type: 'Poll' as const, id: 'LIST' },
      ],
    }),

    // ── GET /polls ──────────────────────────────────────────────────────────
    /**
     * Fetches a paginated list of polls with optional filters.
     *
     * Filters:
     * - `themeIds`: Filter by theme IDs (AND logic)
     * - `voterId`: Filter polls where this user voted
     * - `ownerId`: Filter polls by owner
     *
     * The list respects visibility rules - only polls accessible to the
     * authenticated user are returned.
     *
     * @example
     * const { data } = useListPollsQuery({
     *   page: 1,
     *   limit: 20,
     *   themeIds: ["theme-uuid-1"],
     *   voterId: 42
     * });
     */
    listPolls: build.query<
      PaginatedResponseDto<PollResponseDto>,
      PaginationQueryDto & {
        themeIds?: string[];
        voterId?: number;
        ownerId?: number;
      }
    >({
      query: (params) => {
        const { page, limit, ...filters } = params;
        return {
          url: '/polls',
          params: { page, limit, ...filters },
        };
      },
      providesTags: [{ type: 'Poll' as const, id: 'LIST' }],
    }),

    // ── POST /polls/:id/votes ───────────────────────────────────────────────
    /**
     * Casts a vote for a poll option.
     *
     * - If the user hasn't voted yet, creates a new vote.
     * - If the user already voted, updates their selection (idempotent).
     *
     * Returns the updated option vote count and poll status.
     *
     * @example
     * const [castVote, { isLoading }] = useCastVoteMutation();
     * await castVote({
     *   pollId: "abc123",
     *   optionId: 1
     * }).unwrap();
     */
    castVote: build.mutation<VoteResponseDto, { pollId: string; optionId: number }>({
      query: ({ pollId, optionId }) => ({
        url: `/polls/${pollId}/votes`,
        method: 'POST',
        body: { optionId },
      }),
      // Invalidate poll cache so vote counts refresh
      invalidatesTags: (_result, _error, { pollId }) => [
        { type: 'Poll' as const, id: pollId },
        { type: 'Poll' as const, id: 'LIST' },
      ],
    }),

    // ── GET /polls/:id/votes/me ─────────────────────────────────────────────
    /**
     * Gets the current user's vote for a specific poll.
     *
     * Returns `{ optionId: number }` if they voted, or `null` if not.
     *
     * @example
     * const { data: myVote } = useGetUserVoteQuery({ pollId: "abc123" });
     */
    getUserVote: build.query<{ optionId: number } | null, { pollId: string }>({
      query: ({ pollId }) => `/polls/${pollId}/votes/me`,
      providesTags: (_result, _error, { pollId }) => [{ type: 'Poll' as const, id: pollId }],
    }),

    // ── DELETE /polls/:id/votes/me ──────────────────────────────────────────
    /**
     * Removes the current user's vote from a poll.
     *
     * @example
     * const [removeVote, { isLoading }] = useRemoveVoteMutation();
     * await removeVote({ pollId: "abc123" }).unwrap();
     */
    removeVote: build.mutation<void, { pollId: string }>({
      query: ({ pollId }) => ({
        url: `/polls/${pollId}/votes/me`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { pollId }) => [
        { type: 'Poll' as const, id: pollId },
        { type: 'Poll' as const, id: 'LIST' },
      ],
    }),

    // ── GET /themes ─────────────────────────────────────────────────────────
    /**
     * Fetches all available themes (categories) for filtering.
     *
     * @example
     * const { data: themes } = useListThemesQuery();
     */
    listThemes: build.query<ThemeResponseDto[], void>({
      query: () => '/themes',
      providesTags: [{ type: 'Theme' as const, id: 'LIST' }],
    }),
  }),
  overrideExisting: false,
});

// ---------------------------------------------------------------------------
// Auto-generated hooks — re-exported from the lib index for convenience
// ---------------------------------------------------------------------------

export const {
  useCreatePollMutation,
  useGetPollQuery,
  useLazyGetPollQuery,
  useUpdatePollMutation,
  useClosePollMutation,
  useDeletePollMutation,
  useListPollsQuery,
  useLazyListPollsQuery,
  useCastVoteMutation,
  useGetUserVoteQuery,
  useLazyGetUserVoteQuery,
  useRemoveVoteMutation,
  useListThemesQuery,
  useLazyListThemesQuery,
} = pollsApi;
