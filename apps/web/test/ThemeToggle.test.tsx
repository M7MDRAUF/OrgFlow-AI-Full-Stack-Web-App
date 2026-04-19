// Theme toggle — verifies cycling between light / dark / system.
import { render, screen, fireEvent } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../src/features/theme/ThemeProvider.js';
import { ThemeToggle } from '../src/features/theme/ThemeToggle.js';

// jsdom lacks matchMedia; provide a minimal stub.
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(() => false),
    }),
  });
});

function renderToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

describe('<ThemeToggle />', () => {
  it('renders three options', () => {
    renderToggle();
    expect(screen.getByText('Light')).toBeInTheDocument();
    expect(screen.getByText('Dark')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
  });

  it('activates Dark when clicked', () => {
    renderToggle();
    const darkBtn = screen.getByText('Dark').closest('button');
    expect(darkBtn).toBeTruthy();
    fireEvent.click(darkBtn!);
    expect(darkBtn!.getAttribute('aria-checked')).toBe('true');
  });

  it('activates Light when clicked', () => {
    renderToggle();
    const lightBtn = screen.getByText('Light').closest('button');
    expect(lightBtn).toBeTruthy();
    fireEvent.click(lightBtn!);
    expect(lightBtn!.getAttribute('aria-checked')).toBe('true');
  });
});
