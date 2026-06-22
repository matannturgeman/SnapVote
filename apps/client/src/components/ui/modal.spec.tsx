import { fireEvent, render, screen } from '@testing-library/react';
import { Modal } from './modal';

describe('Modal', () => {
  it('renders title and children', () => {
    render(
      <Modal title="Test title" onClose={jest.fn()}>
        <p>Modal content</p>
      </Modal>,
    );

    expect(screen.getByText('Test title')).toBeTruthy();
    expect(screen.getByText('Modal content')).toBeTruthy();
  });

  it('calls onClose when X button clicked', () => {
    const onClose = jest.fn();
    render(
      <Modal title="T" onClose={onClose}>
        <span />
      </Modal>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop clicked', () => {
    const onClose = jest.fn();
    const { container } = render(
      <Modal title="T" onClose={onClose}>
        <span />
      </Modal>,
    );

    // backdrop is first child of the outer div
    const backdrop = container.querySelector('.absolute.inset-0');
    fireEvent.click(backdrop!);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key pressed', () => {
    const onClose = jest.fn();
    render(
      <Modal title="T" onClose={onClose}>
        <span />
      </Modal>,
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose for non-Escape keys', () => {
    const onClose = jest.fn();
    render(
      <Modal title="T" onClose={onClose}>
        <span />
      </Modal>,
    );

    fireEvent.keyDown(document, { key: 'Enter' });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('has role=dialog and aria-labelledby pointing to title', () => {
    render(
      <Modal title="Accessible title" onClose={jest.fn()}>
        <span />
      </Modal>,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-labelledby')).toBe('modal-title');
    expect(screen.getByText('Accessible title').id).toBe('modal-title');
  });
});
