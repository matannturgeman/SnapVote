import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { selectIsAuthenticated, useAppSelector } from '@libs/client-store';
import { getPersistedToken } from '../lib/token';
import { Card, CardContent } from './ui/card';

interface SessionGateProps {
  isBootstrapping: boolean;
  children: ReactNode;
}

export function SessionGate({ isBootstrapping, children }: SessionGateProps) {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const token = getPersistedToken();

  if (isBootstrapping) {
    return (
      <div className="auth-canvas flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="flex items-center gap-3 p-6">
            <Loader2 className="h-5 w-5 animate-spin text-cyan-700" />
            <p className="text-sm text-slate-700">Checking your session...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!token || !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
