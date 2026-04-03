import { baseApi } from './base-api';
import type {
  CreatePollDto,
  PollResponseDto,
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
  }),
  overrideExisting: false,
});

export const {
  useCreatePollMutation,
  useGetPollQuery,
  useLazyGetPollQuery,
  useUpdatePollMutation,
  useClosePollMutation,
} = pollApi;
