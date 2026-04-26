import { render, screen } from '@testing-library/react';
import Ui from './ui';

describe('Ui', () => {
  it('renders without crashing', () => {
    expect(() => render(<Ui />)).not.toThrow();
  });

  it('renders the "Welcome to Ui!" text', () => {
    render(<Ui />);
    expect(screen.getByText('Welcome to Ui!')).toBeInTheDocument();
  });

  it('matches snapshot', () => {
    const { container } = render(<Ui />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
