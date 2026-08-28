import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HistoryDrawer, ContentVersion } from '../../components/HistoryDrawer';

const versions: ContentVersion[] = [
  {
    hash: 'aaa1111',
    content: 'original',
    savedAt: new Date('2026-01-01T00:00:00Z'),
    isOriginal: true,
  },
  {
    hash: 'bbb2222',
    content: 'updated',
    savedAt: new Date('2026-01-01T00:01:00Z'),
    isOriginal: false,
  },
];

describe('HistoryDrawer', () => {
  it('does not expose restore controls when closed', () => {
    render(
      <HistoryDrawer
        versions={versions}
        isOpen={false}
        currentHash="bbb2222"
        onClose={() => {}}
        onRestore={() => {}}
      />,
    );
    expect(screen.queryByRole('button', { name: /restore/i })).not.toBeInTheDocument();
  });

  it('calls onRestore for a non-current version', () => {
    const onRestore = vi.fn();
    render(
      <HistoryDrawer
        versions={versions}
        isOpen={true}
        currentHash="bbb2222"
        onClose={() => {}}
        onRestore={onRestore}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /restore/i }));
    expect(onRestore).toHaveBeenCalledWith('original');
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(
      <HistoryDrawer
        versions={versions}
        isOpen={true}
        currentHash="bbb2222"
        onClose={onClose}
        onRestore={() => {}}
      />,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
