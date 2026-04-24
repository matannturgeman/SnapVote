import { useEffect, useState } from 'react';
import type { PollResultsDto } from '@libs/shared-dto';

interface PollStreamEvent {
  type: 'results' | 'presence';
  data: PollResultsDto | { count: number };
}

export function usePollStream(pollId: string) {
  const [data, setData] = useState<PollResultsDto | null>(null);
  const [presence, setPresence] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!pollId) return;

    const eventSource = new EventSource(`/polls/${pollId}/stream`);

    eventSource.onmessage = (event) => {
      try {
        const parsed: PollStreamEvent = JSON.parse(event.data);
        if (parsed.type === 'results') {
          setData(parsed.data as PollResultsDto);
        } else if (parsed.type === 'presence') {
          setPresence((parsed.data as { count: number }).count);
        }
      } catch {
        // Ignore parse errors
      }
    };

    eventSource.onopen = () => setIsConnected(true);
    eventSource.onerror = () => setIsConnected(false);

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [pollId]);

  return { data, presence, isConnected };
}
