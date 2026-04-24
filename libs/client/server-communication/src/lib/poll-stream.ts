import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import type { PollResultsDto } from '@libs/shared-dto';
import { BASE_URL, baseApi, readPersistedToken } from './base-api';

export function usePollStream(pollId: string | undefined): {
  presence: number | null;
  isConnected: boolean;
} {
  const dispatch = useDispatch();
  const [presence, setPresence] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!pollId) return;

    const token = readPersistedToken();
    if (!token) return;

    const url = `${BASE_URL}/polls/${pollId}/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);

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
          dispatch(baseApi.util.invalidateTags([{ type: 'Poll', id: pollId }]));
        }
      } catch {
        // ignore malformed messages
      }
    };

    return () => {
      es.close();
      setIsConnected(false);
    };
  }, [pollId, dispatch]);

  return { presence, isConnected };
}
