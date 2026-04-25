import { baseApi } from './base-api';
import type {
  CastVoteDto,
  CreatePollDto,
  CreateShareLinkDto,
  JoinPollResponseDto,
  PaginatedResponseDto,
  PollListQueryDto,
  PollResponseDto,
  PollResultsDto,
  ShareLinkResponseDto,
  UpdatePollDto,
} from '@libs/shared-dto';

export const pollApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    createPoll: build.mutation<PollResponseDto, CreatePollDto>({
      query: (body) => ({
        url: '/polls',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Poll'],
    }),

    getPoll: build.query<PollResponseDto, string>({
      query: (id) => `/polls/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Poll', id }],
    }),

    updatePoll: build.mutation<
      PollResponseDto,
      { id: string; body: UpdatePollDto }
    >({
      query: ({ id, body }) => ({
        url: `/polls/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Poll', id }],
    }),

    closePoll: build.mutation<PollResponseDto, string>({
      query: (id) => ({
        url: `/polls/${id}/close`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [{ type: 'Poll', id }],
    }),

    listShareLinks: build.query<ShareLinkResponseDto[], string>({
      query: (pollId) => `/polls/${pollId}/share-links`,
      providesTags: (_result, _error, pollId) => [
        { type: 'ShareLink', id: pollId },
      ],
    }),

    createShareLink: build.mutation<
      ShareLinkResponseDto,
      { id: string; body: CreateShareLinkDto }
    >({
      query: ({ id, body }) => ({
        url: `/polls/${id}/share-links`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'ShareLink', id }],
    }),

    revokeShareLink: build.mutation<
      ShareLinkResponseDto,
      { id: string; linkId: string }
    >({
      query: ({ id, linkId }) => ({
        url: `/polls/${id}/share-links/${linkId}/revoke`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'ShareLink', id }],
    }),

    joinPollByToken: build.query<JoinPollResponseDto, string>({
      query: (token) => `/polls/join/${token}`,
    }),

    castVote: build.mutation<PollResultsDto, { id: string; body: CastVoteDto }>(
      {
        query: ({ id, body }) => ({
          url: `/polls/${id}/votes`,
          method: 'POST',
          body,
        }),
        invalidatesTags: (_result, _error, { id }) => [{ type: 'Vote', id }],
      },
    ),

    getPollResults: build.query<PollResultsDto, string>({
      query: (id) => `/polls/${id}/results`,
      providesTags: (_result, _error, id) => [{ type: 'Vote', id }],
    }),

    listMyPolls: build.query<
      PaginatedResponseDto<PollResponseDto>,
      Partial<PollListQueryDto> | void
    >({
      query: (params) => ({
        url: '/polls',
        params: params ?? {},
      }),
      providesTags: ['Poll'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useCreatePollMutation,
  useGetPollQuery,
  useLazyGetPollQuery,
  useUpdatePollMutation,
  useClosePollMutation,
  useListShareLinksQuery,
  useCreateShareLinkMutation,
  useRevokeShareLinkMutation,
  useJoinPollByTokenQuery,
  useCastVoteMutation,
  useGetPollResultsQuery,
  useListMyPollsQuery,
} = pollApi;
