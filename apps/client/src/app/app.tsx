import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import {
  clearCredentials,
  setCredentials,
  useAppDispatch,
} from '@libs/client-store';
import { useGetMeQuery } from '@libs/client-server-communication';
import { SessionGate } from '../components/session-gate';
import { HomePage } from '../pages/home.page';
import { LoginPage } from '../pages/login.page';
import { RegisterPage } from '../pages/register.page';
import { ForgotPasswordPage } from '../pages/forgot-password.page';
import { ResetPasswordPage } from '../pages/reset-password.page';
import { CreatePollPage } from '../pages/create-poll.page';
import { PollDetailPage } from '../pages/poll-detail.page';
import { clearPersistedToken, getPersistedToken } from '../lib/token';

export function App() {
  const dispatch = useAppDispatch();
  const token = getPersistedToken();

  const {
    data: me,
    isFetching,
    isSuccess,
    isError,
  } = useGetMeQuery(undefined, {
    skip: !token,
    refetchOnMountOrArgChange: true,
  });

  useEffect(() => {
    if (!token) {
      dispatch(clearCredentials());
      return;
    }
    if (isSuccess && me) {
      dispatch(setCredentials({ user: me, token }));
    }
    if (isError) {
      clearPersistedToken();
      dispatch(clearCredentials());
    }
  }, [dispatch, isError, isSuccess, me, token]);

  const isBootstrapping = Boolean(token) && isFetching;

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/"
        element={
          <SessionGate isBootstrapping={isBootstrapping}>
            <HomePage />
          </SessionGate>
        }
      />
      <Route
        path="/polls/new"
        element={
          <SessionGate isBootstrapping={isBootstrapping}>
            <CreatePollPage />
          </SessionGate>
        }
      />
      <Route
        path="/polls/:id"
        element={
          <SessionGate isBootstrapping={isBootstrapping}>
            <PollDetailPage />
          </SessionGate>
        }
      />
      <Route
        path="*"
        element={<Navigate to={token ? '/' : '/login'} replace />}
      />
    </Routes>
  );
}

export default App;
