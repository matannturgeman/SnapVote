import { baseApi } from './base-api';
import type {
  PaginatedResponseDto,
  PollExploreQueryDto,
  PollResponseDto,
  SetPollThemesDto,
  ThemeResponseDto,
  UserVoteHistoryItemDto,
  UserVoteHistoryQueryDto,
} from '@libs/shared-dto';

export const exploreApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listThemes: build.query<ThemeResponseDto[], void>({
      query: () => '/themes',
      providesTags: ['Theme'],
    }),

    createTheme: build.mutation<
      ThemeResponseDto,
      { slug: string; label: string }
    >({
      query: (body) => ({ url: '/themes', method: 'POST', body }),
      invalidatesTags: ['Theme'],
    }),

    explorePolls: build.query<
      PaginatedResponseDto<PollResponseDto>,
      Partial<PollExploreQueryDto>
    >({
      query: (params) => ({ url: '/polls/explore', params }),
      providesTags: ['Poll'],
    }),

    setPollThemes: build.mutation<
      { success: boolean },
      { pollId: string; body: SetPollThemesDto }
    >({
      query: ({ pollId, body }) => ({
        url: `/polls/${pollId}/themes`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { pollId }) => [
        { type: 'Poll', id: pollId },
      ],
    }),

    getUserVotes: build.query<
      PaginatedResponseDto<UserVoteHistoryItemDto>,
      { userId: number } & Partial<UserVoteHistoryQueryDto>
    >({
      query: ({ userId, ...params }) => ({
        url: `/users/${userId}/votes`,
        params,
      }),
      providesTags: ['Vote'],
    }),
  }),
});

export const {
  useListThemesQuery,
  useCreateThemeMutation,
  useExplorePollsQuery,
  useSetPollThemesMutation,
  useGetUserVotesQuery,
} = exploreApi;
