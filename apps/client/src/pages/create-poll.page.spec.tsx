import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { CreatePollPage } from './create-poll.page';

const mockNavigate = jest.fn();
const mockCreatePoll = jest.fn();
const mockUseCreatePollMutation = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('@libs/client-server-communication', () => ({
  useCreatePollMutation: (...args: unknown[]) =>
    mockUseCreatePollMutation(...args),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <CreatePollPage />
    </MemoryRouter>,
  );
}

describe('CreatePollPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockCreatePoll.mockReset();
    mockUseCreatePollMutation.mockReset();
    mockUseCreatePollMutation.mockReturnValue([
      mockCreatePoll,
      { isLoading: false, error: undefined },
    ]);
  });

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  it('renders the title input and two option inputs by default', () => {
    renderPage();

    expect(screen.getByLabelText('Question / Title')).toBeTruthy();
    expect(screen.getByPlaceholderText('Option 1')).toBeTruthy();
    expect(screen.getByPlaceholderText('Option 2')).toBeTruthy();
  });

  it('renders the Create poll button', () => {
    renderPage();
    expect(screen.getByRole('button', { name: 'Create poll' })).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // Validation — submit button state
  // ---------------------------------------------------------------------------

  it('disables submit button when title is empty', () => {
    renderPage();

    fireEvent.change(screen.getByPlaceholderText('Option 1'), {
      target: { value: 'React' },
    });
    fireEvent.change(screen.getByPlaceholderText('Option 2'), {
      target: { value: 'Vue' },
    });

    expect(screen.getByRole('button', { name: 'Create poll' })).toBeDisabled();
  });

  it('disables submit button when fewer than 2 non-empty options exist', () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('Question / Title'), {
      target: { value: 'My poll' },
    });
    fireEvent.change(screen.getByPlaceholderText('Option 1'), {
      target: { value: 'Only one' },
    });

    expect(screen.getByRole('button', { name: 'Create poll' })).toBeDisabled();
  });

  it('enables submit button when title and at least 2 options are filled', () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('Question / Title'), {
      target: { value: 'My poll' },
    });
    fireEvent.change(screen.getByPlaceholderText('Option 1'), {
      target: { value: 'React' },
    });
    fireEvent.change(screen.getByPlaceholderText('Option 2'), {
      target: { value: 'Vue' },
    });

    expect(
      screen.getByRole('button', { name: 'Create poll' }),
    ).not.toBeDisabled();
  });

  it('shows helper text when fewer than 2 options are filled', () => {
    renderPage();

    expect(
      screen.getByText('Fill in at least 2 options to continue.'),
    ).toBeTruthy();
  });

  it('hides helper text once 2 options are filled', () => {
    renderPage();

    fireEvent.change(screen.getByPlaceholderText('Option 1'), {
      target: { value: 'React' },
    });
    fireEvent.change(screen.getByPlaceholderText('Option 2'), {
      target: { value: 'Vue' },
    });

    expect(
      screen.queryByText('Fill in at least 2 options to continue.'),
    ).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Adding / removing options
  // ---------------------------------------------------------------------------

  it('adds a new option input when "Add option" is clicked', () => {
    renderPage();

    fireEvent.click(screen.getByText('Add option'));

    expect(screen.getByPlaceholderText('Option 3')).toBeTruthy();
  });

  it('remove buttons are not shown when only 2 options exist', () => {
    renderPage();

    // With exactly 2 options, no X buttons should be visible
    expect(screen.queryByRole('button', { name: '' })).toBeNull();
  });

  it('shows remove buttons when more than 2 options exist', () => {
    renderPage();

    fireEvent.click(screen.getByText('Add option'));

    // There should now be remove buttons (one per option row since length > 2)
    const xButtons = screen
      .getAllByRole('button')
      .filter((btn) => btn.getAttribute('type') === 'button');
    // At least one non-add remove button
    expect(xButtons.length).toBeGreaterThan(1);
  });

  // ---------------------------------------------------------------------------
  // Submission
  // ---------------------------------------------------------------------------

  it('calls createPoll with trimmed values and navigates on success', async () => {
    mockCreatePoll.mockReturnValue({
      unwrap: () => Promise.resolve({ id: 'new-poll-id' }),
    });

    renderPage();

    fireEvent.change(screen.getByLabelText('Question / Title'), {
      target: { value: '  Best framework?  ' },
    });
    fireEvent.change(screen.getByPlaceholderText('Option 1'), {
      target: { value: 'React' },
    });
    fireEvent.change(screen.getByPlaceholderText('Option 2'), {
      target: { value: 'Vue' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create poll' }));

    await waitFor(() => {
      expect(mockCreatePoll).toHaveBeenCalledWith({
        title: 'Best framework?',
        description: undefined,
        options: ['React', 'Vue'],
      });
    });

    expect(mockNavigate).toHaveBeenCalledWith('/polls/new-poll-id');
  });

  it('includes description when filled', async () => {
    mockCreatePoll.mockReturnValue({
      unwrap: () => Promise.resolve({ id: 'poll-2' }),
    });

    renderPage();

    fireEvent.change(screen.getByLabelText('Question / Title'), {
      target: { value: 'My poll' },
    });
    fireEvent.change(screen.getByLabelText('Description (optional)'), {
      target: { value: 'Some context' },
    });
    fireEvent.change(screen.getByPlaceholderText('Option 1'), {
      target: { value: 'A' },
    });
    fireEvent.change(screen.getByPlaceholderText('Option 2'), {
      target: { value: 'B' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create poll' }));

    await waitFor(() => {
      expect(mockCreatePoll).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'Some context' }),
      );
    });
  });

  it('does not call createPoll when canSubmit is false', () => {
    renderPage();

    // Submit with empty title
    fireEvent.submit(
      screen.getByRole('button', { name: 'Create poll' }).closest('form')!,
    );

    expect(mockCreatePoll).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------

  it('shows error message when mutation returns an error', () => {
    mockUseCreatePollMutation.mockReturnValue([
      mockCreatePoll,
      { isLoading: false, error: { status: 500 } },
    ]);

    renderPage();

    expect(
      screen.getByText('Could not create poll. Please try again.'),
    ).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  it('shows loading text and disables submit while isLoading is true', () => {
    mockUseCreatePollMutation.mockReturnValue([
      mockCreatePoll,
      { isLoading: true, error: undefined },
    ]);

    renderPage();

    const btn = screen.getByRole('button', { name: /Creating/i });
    expect(btn).toBeDisabled();
  });
});
