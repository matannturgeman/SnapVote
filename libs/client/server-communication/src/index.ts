// @libs/client-server-communication - public API
//
// This library exposes RTK Query endpoints built on top of a shared
// `fetchBaseQuery` base. Import hooks directly into React components;
// wire `baseApi.reducer` and `baseApi.middleware` into the Redux store.

// ---------------------------------------------------------------------------
// Core
// ---------------------------------------------------------------------------
export { baseApi, baseQueryWithReauth } from './lib/base-api';
export type { ApiTagType } from './lib/base-api';

// ---------------------------------------------------------------------------
// Auth endpoints & hooks
// ---------------------------------------------------------------------------
export { authApi } from './lib/auth.api';
export {
  useLoginMutation,
  useRegisterMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useLogoutMutation,
  useGetMeQuery,
  useLazyGetMeQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
  useDeleteAccountMutation,
  useReactivateAccountMutation,
  useUploadAvatarMutation,
} from './lib/auth.api';

// ---------------------------------------------------------------------------
// Poll endpoints & hooks
// ---------------------------------------------------------------------------
export { pollApi } from './lib/poll.api';
export {
  useCreatePollMutation,
  useGetPollQuery,
  useLazyGetPollQuery,
  useUpdatePollMutation,
  useClosePollMutation,
  useLockPollMutation,
  useDeletePollMutation,
  useListShareLinksQuery,
  useCreateShareLinkMutation,
  useRevokeShareLinkMutation,
  useReportPollMutation,
  useJoinPollByTokenQuery,
  useCastVoteMutation,
  useDeleteVoteMutation,
  useGetPollResultsQuery,
  useListMyPollsQuery,
} from './lib/poll.api';
export { usePollStream } from './lib/poll-stream';

// ---------------------------------------------------------------------------
// Users endpoints & hooks
// ---------------------------------------------------------------------------
export { usersApi } from './lib/users.api';
export {
  useGetUsersQuery,
  useLazyGetUsersQuery,
  useGetUserByIdQuery,
  useLazyGetUserByIdQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
} from './lib/users.api';
