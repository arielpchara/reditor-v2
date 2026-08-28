import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toolbar } from '../../components/Toolbar';

describe('Toolbar', () => {
  it('disables Save when the buffer is clean', () => {
    render(
      <Toolbar
        filename="app.ts"
        isDirty={false}
        isSaving={false}
        onSave={() => {}}
        onHistoryOpen={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });

  it('enables Save when dirty and calls onSave', () => {
    const onSave = vi.fn();
    render(
      <Toolbar
        filename="app.ts"
        isDirty={true}
        isSaving={false}
        onSave={onSave}
        onHistoryOpen={() => {}}
      />,
    );
    const save = screen.getByRole('button', { name: /save/i });
    expect(save).toBeEnabled();
    fireEvent.click(save);
    expect(onSave).toHaveBeenCalledOnce();
  });

  it('exposes history via accessible name', () => {
    render(
      <Toolbar
        filename="app.ts"
        isDirty={false}
        isSaving={false}
        onSave={() => {}}
        onHistoryOpen={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /file history/i })).toBeInTheDocument();
  });
});
