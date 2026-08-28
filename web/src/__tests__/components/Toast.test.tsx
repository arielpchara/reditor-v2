import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Toast } from '../../components/Toast';

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('announces the message as a status', () => {
    render(<Toast message="Saved" kind="ok" onHide={() => {}} />);
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
  });

  it('calls onHide after the duration', () => {
    const onHide = vi.fn();
    render(<Toast message="Saved" kind="ok" duration={1000} onHide={onHide} />);
    vi.advanceTimersByTime(1000);
    expect(onHide).toHaveBeenCalledOnce();
  });
});
