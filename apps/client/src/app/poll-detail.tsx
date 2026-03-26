import React from 'react';
import {
  useGetPollQuery,
  useCastVoteMutation,
} from '@libs/client-server-communication';
import { useAuth } from '@libs/client-store';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Label,
  Plus,
  Trash2,
  Loader2,
} from '@libs/client-ui';
import { cn } from '../lib/utils';

interface PollDetailProps {
  pollId: string;
}

const PollDetail: React.FC<PollDetailProps> = ({ pollId }) => {
  const { data: poll, isLoading } = useGetPollQuery({ pollId });
  const { user } = useAuth();
  const [voteError, setVoteError] = React.useState<string | null>(null);

  const castVote = React.useCallback(
    async (optionId: number) => {
      if (!user) {
        setVoteError('You must be logged in to vote');
        return;
      }

      try {
        await useCastVoteMutation({ pollId, optionId });
        setVoteError(null);
      } catch (error) {
        setVoteError(error.message || 'Failed to cast vote');
      }
    },
    [pollId, user],
  );

  if (isLoading) return <Loader2 />;
  if (!poll) return <div>Poll not found</div>;

  const totalVotes = poll.options.reduce(
    (sum, option) => sum + option.voteCount,
    0,
  );
  const votePercentages = poll.options.map(
    (option) => (option.voteCount / totalVotes) * 100,
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>{poll.title}</CardTitle>
          <CardDescription>
            {poll.description || 'No description provided'}
          </CardDescription>
        </CardHeader>

        <CardContent className="py-6">
          <div className="mb-6">
            <p className="text-lg font-medium">Status: {poll.status}</p>
            <p className="text-sm text-gray-600">
              {poll.status === 'OPEN' ? 'Voting is open' : 'Voting is closed'}
            </p>
          </div>

          <div className="mb-8">
            {poll.options.map((option, index) => (
              <div key={index} className="flex flex-col sm:flex-row gap-4">
                <div className="w-1/3">
                  <Label className="text-lg font-medium">{option.text}</Label>
                  <p className="text-sm text-gray-600">
                    Votes: {option.voteCount}
                  </p>
                </div>

                <div className="w-1/3">
                  <div className="relative h-16 mb-2">
                    <div
                      className={`h-full bg-green-300 rounded-lg
                        transition-all duration-300
                        width-${votePercentages[index]}`}
                      aria-label={`{option.text} votes: {votePercentages[index]}%`}
                    />
                  </div>
                  <p className="text-sm text-gray-600">
                    {votePercentages[index].toFixed(1)}%
                  </p>
                </div>

                {user?.id === poll.ownerId && (
                  <div className="w-1/3">
                    <Button
                      variant="outline"
                      onClick={() => setVoteError(null)}
                      disabled={poll.status !== 'OPEN'}
                    >
                      Edit Poll
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {poll.status === 'OPEN' && (
            <div className="mb-6">
              {poll.options.map((option, index) => (
                <div key={index} className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    onClick={() => castVote(option.id)}
                    disabled={!user || poll.status !== 'OPEN'}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Vote for {option.text}
                  </Button>

                  {voteError && (
                    <div className="mt-2 text-red-500 text-sm">{voteError}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {poll.status === 'CLOSED' && (
            <div className="mb-6">
              <CardHeader className="mb-4">
                <CardTitle>Final Results</CardTitle>
              </CardHeader>

              <div className="flex flex-col sm:flex-row gap-4">
                {poll.options.map((option, index) => (
                  <div key={index} className="flex-1 p-4">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="w-1/3">
                        <Label className="text-lg font-medium">
                          {option.text}
                        </Label>
                        <p className="text-sm text-gray-600">
                          {option.voteCount} votes
                        </p>
                      </div>

                      <div className="w-1/3">
                        <div className="relative h-16 mb-2">
                          <div
                            className={`h-full bg-green-300 rounded-lg
                              transition-all duration-300
                              width-${(option.voteCount / totalVotes) * 100}`}
                            aria-label={`{option.text} votes: ${(option.voteCount / totalVotes) * 100}%`}
                          />
                        </div>
                        <p className="text-sm text-gray-600">
                          {((option.voteCount / totalVotes) * 100).toFixed(1)}%
                        </p>
                      </div>

                      <div className="w-1/3">
                        <p className="text-sm text-gray-600">
                          {option.voteCount} / {totalVotes}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PollDetail;
