import { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { ThemeToggle } from './ui/theme-toggle';

interface AuthShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: AuthShellProps) {
  return (
    <div className="auth-canvas flex min-h-screen items-center justify-center p-4 sm:p-6">
      <ThemeToggle className="fixed right-4 top-4 z-50" />
      <div className="w-full max-w-md auth-float">
        <Card>
          <CardHeader className="space-y-3">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200">
              <Sparkles className="h-3.5 w-3.5" />
              {eyebrow}
            </span>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">{children}</CardContent>
        </Card>
      </div>
    </div>
  );
}
