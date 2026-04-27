import { baseApi } from './base-api';
import type {
  LoginDto,
  RegisterDto,
  ForgotPasswordRequestDto,
  ReactivateAccountDto,
  ResetPasswordDto,
  AuthResponseDto,
  MessageResponseDto,
  SuccessResponseDto,
  UserResponseDto,
  UpdateProfileDto,
  ChangePasswordDto,
} from '@libs/shared-dto';

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    login: build.mutation<AuthResponseDto, LoginDto>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['Auth'],
    }),

    register: build.mutation<AuthResponseDto, RegisterDto>({
      query: (body) => ({
        url: '/auth/register',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Auth'],
    }),

    forgotPassword: build.mutation<
      MessageResponseDto,
      ForgotPasswordRequestDto
    >({
      query: (body) => ({
        url: '/auth/forgot-password',
        method: 'POST',
        body,
      }),
    }),

    resetPassword: build.mutation<MessageResponseDto, ResetPasswordDto>({
      query: (body) => ({
        url: '/auth/reset-password',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Auth'],
    }),

    logout: build.mutation<SuccessResponseDto, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['Auth'],
    }),

    getMe: build.query<UserResponseDto, void>({
      query: () => '/auth/me',
      providesTags: ['Auth'],
    }),

    updateProfile: build.mutation<UserResponseDto, UpdateProfileDto>({
      query: (body) => ({
        url: '/auth/profile',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Auth'],
    }),

    changePassword: build.mutation<MessageResponseDto, ChangePasswordDto>({
      query: (body) => ({
        url: '/auth/change-password',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Auth'],
    }),

    deleteAccount: build.mutation<SuccessResponseDto, void>({
      query: () => ({
        url: '/auth/account',
        method: 'DELETE',
      }),
      invalidatesTags: ['Auth'],
    }),

    reactivateAccount: build.mutation<AuthResponseDto, ReactivateAccountDto>({
      query: (body) => ({
        url: '/auth/reactivate',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Auth'],
    }),

    uploadAvatar: build.mutation<UserResponseDto, File>({
      query: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return { url: '/auth/avatar', method: 'POST', body: formData };
      },
      async onQueryStarted(_file, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(
          authApi.util.updateQueryData('getMe', undefined, () => data),
        );
      },
    }),
  }),
  overrideExisting: false,
});

export const {
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
} = authApi;
