import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { PollDetailPage } from './poll-detail.page';

const mockUseGetPollQuery = jest.fn();
const mockUseUpdatePollMutation = jest.fn();
const mockUseClosePollMutation = jest.fn();
const mockUseListShareLinksQuery = jest.fn();
const mockUseCreateShareLinkMutation = jest.fn();
const mockUseRevokeShareLinkMutation = jest.fn();
const mockUseCastVoteMutation = jest.fn();
const mockUseGetPollResultsQuery = jest.fn();
const mockUpdatePoll = jest.fn();
const mockClosePoll = jest.fn();

let mockCurrentUser: { id: number; email: string; name: string } | null = null;

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ id: 'poll-1' }),
}));

jest.mock('@libs/client-store', () => ({
  selectCurrentUser: (state: { auth: { user: unknown } }) => state?.auth?.user,
  useAppSelector: (selector: unknown) =>
    typeof selector === 'function'
      ? selector({ auth: { user: mockCurrentUser } })
      : mockCurrentUser,
}));

jest.mock('@libs/client-server-communication', () => ({
  useGetPollQuery: (...args: unknown[]) => mockUseGetPollQuery(...args),
  useUpdatePollMutation: (...args: unknown[]) =>
    mockUseUpdatePollMutation(...args),
  useClosePollMutation: (...args: unknown[]) =>
    mockUseClosePollMutation(...args),
  useListShareLinksQuery: (...args: unknown[]) =>
    mockUseListShareLinksQuery(...args),
  useCreateShareLinkMutation: (...args: unknown[]) =>
    mockUseCreateShareLinkMutation(...args),
  useRevokeShareLinkMutation: (...args: unknown[]) =>
    mockUseRevokeShareLinkMutation(...args),
  useCastVoteMutation: (...args: unknown[]) => mockUseCastVoteMutation(...args),
  useGetPollResultsQuery: (...args: unknown[]) =>
    mockUseGetPollResultsQuery(...args),
  usePollStream: () => ({ presence: null, isConnected: false }),
}));

const OWNER = { id: 1, email: 'owner@example.com', name: 'Owner' };

const OPEN_POLL = {
  id: 'poll-1',
  title: 'Favourite framework?',
  description: undefined as string | undefined,
  status: 'OPEN' as const,
  ownerId: 1,
  openedAt: new Date('2026-01-01'),
  closedAt: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  options: [
    { id: 'opt-1', text: 'React', order: 0 },
    { id: 'opt-2', text: 'Vue', order: 1 },
  ],
};

function renderPage() {
  return render(
    <MemoryRouter>
      <PollDetailPage />
    </MemoryRouter>,
  );
}

describe('PollDetailPage', () => {
  beforeEach(() => {
    mockCurrentUser = OWNER;
    mockUpdatePoll.mockReset();
    mockClosePoll.mockReset();

    mockUseGetPollQuery.mockReturnValue({
      data: OPEN_POLL,
      isLoading: false,
      isError: false,
    });

    mockUseUpdatePollMutation.mockReturnValue([
      mockUpdatePoll,
      { isLoading: false, error: undefined },
    ]);

    mockUseClosePollMutation.mockReturnValue([
      mockClosePoll,
      { isLoading: false },
    ]);

    mockUseListShareLinksQuery.mockReturnValue({ data: [] });
    mockUseCreateShareLinkMutation.mockReturnValue([
      jest.fn(),
      { isLoading: false },
    ]);
    mockUseRevokeShareLinkMutation.mockReturnValue([jest.fn()]);
    mockUseCastVoteMutation.mockReturnValue([jest.fn(), { isLoading: false }]);
    mockUseGetPollResultsQuery.mockReturnValue({
      data: undefined,
      refetch: jest.fn(),
    });
  });

  // ---------------------------------------------------------------------------
  // Loading / error states
  // ---------------------------------------------------------------------------

  it('shows a spinner while data is loading', () => {
    mockUseGetPollQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    renderPage();

    expect(document.querySelector('.animate-spin')).toBeTruthy();
  });

  it('shows "Poll not found" when isError is true', () => {
    mockUseGetPollQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });

    renderPage();

    expect(screen.getByText('Poll not found.')).toBeTruthy();
  });

  it('shows "Poll not found" when data is undefined and not loading', () => {
    mockUseGetPollQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });

    renderPage();

    expect(screen.getByText('Poll not found.')).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // Normal poll rendering
  // ---------------------------------------------------------------------------

  it('renders the poll title and options', () => {
    renderPage();

    expect(screen.getByText('Favourite framework?')).toBeTruthy();
    expect(screen.getByText('React')).toBeTruthy();
    expect(screen.getByText('Vue')).toBeTruthy();
  });

  it('renders the OPEN status badge', () => {
    renderPage();

    expect(screen.getByText('OPEN')).toBeTruthy();
  });

  it('renders the CLOSED status badge for a closed poll', () => {
    mockUseGetPollQuery.mockReturnValue({
      data: { ...OPEN_POLL, status: 'CLOSED' },
      isLoading: false,
      isError: false,
    });

    renderPage();

    expect(screen.getByText('CLOSED')).toBeTruthy();
  });

  it('renders poll description when present', () => {
    mockUseGetPollQuery.mockReturnValue({
      data: { ...OPEN_POLL, description: 'Pick your favourite' },
      isLoading: false,
      isError: false,
    });

    renderPage();

    expect(screen.getByText('Pick your favourite')).toBeTruthy();
  });

  it('renders the poll ID at the bottom', () => {
    renderPage();

    expect(screen.getByText('Poll ID: poll-1')).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // Owner controls
  // ---------------------------------------------------------------------------

  it('shows Edit and Close poll buttons for the owner of an open poll', () => {
    renderPage();

    expect(screen.getByRole('button', { name: 'Edit' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Close poll' })).toBeTruthy();
  });

  it('does not show Edit/Close buttons for a non-owner', () => {
    mockCurrentUser = { id: 99, email: 'other@example.com', name: 'Other' };

    renderPage();

    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Close poll' })).toBeNull();
  });

  it('does not show Edit/Close buttons for a closed poll even if owner', () => {
    mockUseGetPollQuery.mockReturnValue({
      data: { ...OPEN_POLL, status: 'CLOSED' },
      isLoading: false,
      isError: false,
    });

    renderPage();

    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Close poll' })).toBeNull();
  });

  it('shows vote panel for non-owner on an open poll', () => {
    mockCurrentUser = { id: 99, email: 'other@example.com', name: 'Other' };

    renderPage();

    expect(screen.getByText('Cast your vote')).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // Close poll
  // ---------------------------------------------------------------------------

  it('calls closePoll with the poll id when Close poll is clicked', async () => {
    mockClosePoll.mockReturnValue({
      unwrap: () => Promise.resolve({ ...OPEN_POLL, status: 'CLOSED' }),
    });

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Close poll' }));

    await waitFor(() => {
      expect(mockClosePoll).toHaveBeenCalledWith('poll-1');
    });
  });

  it('shows close error message when closePoll rejects', async () => {
    mockClosePoll.mockReturnValue({
      unwrap: () => Promise.reject(new Error('Server error')),
    });

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Close poll' }));

    await waitFor(() => {
      expect(
        screen.getByText('Could not close the poll. Please try again.'),
      ).toBeTruthy();
    });
  });

  it('shows spinner on close button while closing', () => {
    mockUseClosePollMutation.mockReturnValue([
      mockClosePoll,
      { isLoading: true },
    ]);

    renderPage();

    expect(screen.queryByRole('button', { name: 'Close poll' })).toBeNull();
    expect(document.querySelector('.animate-spin')).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // Edit mode
  // ---------------------------------------------------------------------------

  it('switches to edit form when Edit is clicked', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
  });

  it('pre-fills edit form with current poll values', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

    expect(
      (screen.getByDisplayValue('Favourite framework?') as HTMLInputElement)
        .value,
    ).toBe('Favourite framework?');
    expect(screen.getByDisplayValue('React')).toBeTruthy();
    expect(screen.getByDisplayValue('Vue')).toBeTruthy();
  });

  it('returns to view mode when Cancel is clicked in edit form', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByText('Favourite framework?')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
  });

  it('calls updatePoll with trimmed values and exits edit mode on success', async () => {
    mockUpdatePoll.mockReturnValue({
      unwrap: () => Promise.resolve(OPEN_POLL),
    });

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

    const titleInput = screen.getByDisplayValue('Favourite framework?');
    fireEvent.change(titleInput, { target: { value: 'Updated title' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mockUpdatePoll).toHaveBeenCalledWith({
        id: 'poll-1',
        body: expect.objectContaining({ title: 'Updated title' }),
      });
    });

    // After success, edit mode should be exited
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
    });
  });

  it('keeps edit form open and shows error message when updatePoll fails', async () => {
    mockUseUpdatePollMutation.mockReturnValue([
      mockUpdatePoll,
      { isLoading: false, error: { status: 500 } },
    ]);

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

    expect(
      screen.getByText('Could not save changes. Please try again.'),
    ).toBeTruthy();
  });

  it('disables Save when edit title is empty', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

    const titleInput = screen.getByDisplayValue('Favourite framework?');
    fireEvent.change(titleInput, { target: { value: '' } });

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('shows loading spinner on Save button while updating', () => {
    mockUseUpdatePollMutation.mockReturnValue([
      mockUpdatePoll,
      { isLoading: true, error: undefined },
    ]);

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

    // Save label is hidden; spinner visible instead
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
    expect(document.querySelector('.animate-spin')).toBeTruthy();
  });
});
