import { JSX, useEffect } from 'react';
import './HistoryDrawer.css';

export type ContentVersion = {
  hash: string;
  content: string;
  savedAt: Date;
  isOriginal: boolean;
};

export type HistoryDrawerProps = {
  versions: ContentVersion[];
  isOpen: boolean;
  currentHash: string;
  onClose: () => void;
  onRestore: (content: string) => void;
};

/** FNV-1a 32-bit hash — fast content deduplication key. */
export function hashContent(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

function formatSavedAt(date: Date): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  return (
    date.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
    ' · ' +
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );
}

export function HistoryDrawer({
  versions,
  isOpen,
  currentHash,
  onClose,
  onRestore,
}: HistoryDrawerProps): JSX.Element {
  const sorted = [...versions].reverse();

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  return (
    <>
      {isOpen && <div className="history__backdrop" onClick={onClose} />}
      <aside
        className={`history ${isOpen ? 'history--open' : ''}`}
        aria-label="File history"
        aria-hidden={!isOpen}
        inert={!isOpen}
      >
        <div className="history__header">
          <span className="history__title">History</span>
          <button
            type="button"
            className="history__close"
            onClick={onClose}
            aria-label="Close history"
            tabIndex={isOpen ? 0 : -1}
          >
            <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor">
              <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.749.749 0 111.06 1.06L9.06 8l3.22 3.22a.749.749 0 11-1.06 1.06L8 9.06l-3.22 3.22a.749.749 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
            </svg>
          </button>
        </div>

        <ul className="history__list">
          {sorted.length === 0 && <li className="history__empty">No versions yet.</li>}
          {sorted.map((v) => {
            const isCurrent = v.hash === currentHash;
            return (
              <li
                key={v.hash}
                className={`history__item ${isCurrent ? 'history__item--current' : ''}`}
              >
                <div className="history__item-meta">
                  <div className="history__item-time">
                    {v.isOriginal && <span className="history__badge">Original</span>}
                    {formatSavedAt(v.savedAt)}
                  </div>
                  <span className="history__hash">{v.hash.slice(0, 7)}</span>
                </div>
                <button
                  type="button"
                  className="history__restore"
                  disabled={isCurrent}
                  tabIndex={isOpen ? 0 : -1}
                  onClick={() => onRestore(v.content)}
                >
                  {isCurrent ? 'Current' : 'Restore'}
                </button>
              </li>
            );
          })}
        </ul>
      </aside>
    </>
  );
}
