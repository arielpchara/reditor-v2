import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { Editor } from '../../components/Editor';

const remove = vi.fn();
const setOptions = vi.fn();

vi.mock('prism-code-editor/setups', () => ({
  basicEditor: vi.fn((_el: HTMLElement, _opts: unknown, cb?: () => void) => {
    cb?.();
    return {
      remove,
      setOptions,
      value: '',
      textarea: document.createElement('textarea'),
    };
  }),
}));

describe('Editor', () => {
  beforeEach(() => {
    remove.mockClear();
    setOptions.mockClear();
  });

  it('calls remove on unmount', () => {
    const { unmount } = render(
      <Editor language="javascript" value="const x = 1;" onChange={() => {}} />,
    );
    unmount();
    expect(remove).toHaveBeenCalled();
  });
});
