// Component test — renders the shared Button primitive.
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '@orgflow/ui';

describe('<Button />', () => {
  it('renders its label', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('fires onClick', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click me</Button>);
    const btn = screen.getByRole('button', { name: 'Click me' });
    btn.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('honors disabled state', () => {
    render(<Button disabled>No</Button>);
    expect(screen.getByRole('button', { name: 'No' })).toBeDisabled();
  });
});
