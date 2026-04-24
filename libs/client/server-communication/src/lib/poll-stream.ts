import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import type { PollResultsDto } from '@libs/shared-dto';
import { baseApi } from './base-api';

const API_BASE_URL =
  (typeof process !== 'undefined' && process.env['VITE_API_BASE_URL']) ||
  (typeof process !== 'undefined' && process.env['API_BASE_URL']) ||
  'http://localhost:3000/api';

function getStoredToken(): string | null {
  try {
    return window.localStorage.getItem('accessToken');
  } catch {
    return null;
  }
}

export function usePollStream(pollId: string | undefined): {
  presence: number | null;
  isConnected: boolean;
} {
  const dispatch = useDispatch();
  const [presence, setPresence] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  // Track the current pollId so the cleanup function closes the right source
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!pollId) return;

    const token = getStoredToken();
    if (!token) return;

    const url = `${API_BASE_URL}/polls/${pollId}/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => setIsConnected(true);
    es.onerror = () => setIsConnected(false);

    es.onmessage = (event: MessageEvent<string>) => {
      try {
        const parsed = JSON.parse(event.data) as {
          type: string;
          data: unknown;
        };

        if (parsed.type === 'results') {
          dispatch(
            baseApi.util.updateQueryData(
              'getPollResults',
              pollId,
              () => parsed.data as PollResultsDto,
            ),
          );
        } else if (parsed.type === 'presence') {
          setPresence((parsed.data as { count: number }).count);
        } else if (parsed.type === 'closed') {
          // Refetch the poll so the status badge updates
          dispatch(baseApi.util.invalidateTags([{ type: 'Poll', id: pollId }]));
        }
      } catch {
        // ignore malformed messages
      }
    };

    return () => {
      es.close();
      esRef.current = null;
      setIsConnected(false);
    };
  }, [pollId, dispatch]);

  return { presence, isConnected };
}
