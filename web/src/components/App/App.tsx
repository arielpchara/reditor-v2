import './App.css';
import { JSX, useCallback, useEffect, useRef, useState } from 'react';
import { Editor } from '../Editor';
import { OtpDialog } from '../OtpDialog';
import { Toolbar } from '../Toolbar';
import { Toast, ToastKind } from '../Toast';
import { HistoryDrawer, ContentVersion, hashContent } from '../HistoryDrawer';
import { clearSessionToken, getSessionToken } from '../../otpApi';
import { detectLanguage } from '../../detectLanguage';
import { fetchWithAuth } from '../../fileApi';

type ToastState = { message: string; kind: ToastKind; key: number } | null;
type LoadPhase = 'loading' | 'auth' | 'ready' | 'error';

export function App(): JSX.Element {
  const [phase, setPhase] = useState<LoadPhase>('loading');
  const [filename, setFilename] = useState('');
  const [language, setLanguage] = useState('plaintext');
  const [editorContent, setEditorContent] = useState('');
  const [toast, setToast] = useState<ToastState>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [history, setHistory] = useState<ContentVersion[]>([]);
  const [currentHash, setCurrentHash] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const savedContentRef = useRef<string>('');
  const savingRef = useRef(false);

  const beginReauth = useCallback((): void => {
    clearSessionToken();
    setPhase('auth');
  }, []);

  const loadFileData = useCallback(async (): Promise<void> => {
    const metaRes = await fetchWithAuth('/file-meta');
    if (metaRes.status === 401) {
      beginReauth();
      return;
    }
    if (!metaRes.ok) {
      setErrorMsg('Failed to load file info');
      setPhase('error');
      return;
    }
    const meta = (await metaRes.json()) as { filename: string };
    setFilename(meta.filename);
    setLanguage(detectLanguage(meta.filename));
    document.title = `Reditor — ${meta.filename}`;

    const fileRes = await fetchWithAuth('/file');
    if (fileRes.status === 401) {
      beginReauth();
      return;
    }
    if (!fileRes.ok) {
      setErrorMsg('Failed to load file');
      setPhase('error');
      return;
    }
    const content = await fileRes.text();
    setEditorContent(content);
    savedContentRef.current = content;
    const hash = hashContent(content);
    setCurrentHash(hash);
    setHistory([{ hash, content, savedAt: new Date(), isOriginal: true }]);
    setPhase('ready');
  }, [beginReauth]);

  useEffect(() => {
    (async (): Promise<void> => {
      try {
        const healthRes = await fetch('/health');
        if (!healthRes.ok) {
          setErrorMsg('Failed to reach server');
          setPhase('error');
          return;
        }
        const health = (await healthRes.json()) as { status: string; securityEnabled?: boolean };
        if (health.securityEnabled === true && !getSessionToken()) {
          setPhase('auth');
          return;
        }
        await loadFileData();
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : String(err));
        setPhase('error');
      }
    })();
  }, [loadFileData]);

  const handleAuthSuccess = useCallback(async (): Promise<void> => {
    try {
      await loadFileData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setPhase('error');
    }
  }, [loadFileData]);

  const showToast = useCallback((message: string, kind: ToastKind): void => {
    setToast({ message, kind, key: Date.now() });
  }, []);

  const handleSave = useCallback(async (): Promise<void> => {
    if (savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    const content = editorContent;
    try {
      const res = await fetchWithAuth('/file', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (res.status === 401) {
        beginReauth();
        return;
      }
      if (res.ok) {
        savedContentRef.current = content;
        setIsDirty(false);
        const hash = hashContent(content);
        setCurrentHash(hash);
        setHistory((prev) => {
          if (prev.some((v) => v.hash === hash)) return prev;
          return [...prev, { hash, content, savedAt: new Date(), isOriginal: false }];
        });
        showToast('Saved', 'ok');
      } else {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        showToast(body.error ?? `Error ${res.status}`, 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }, [editorContent, showToast, beginReauth]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (isDirty && !isSaving) void handleSave();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isDirty, isSaving, handleSave]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent): void => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  const handleRestore = useCallback((content: string): void => {
    setEditorContent(content);
    setIsDirty(content !== savedContentRef.current);
    setCurrentHash(hashContent(content));
    setHistoryOpen(false);
  }, []);

  if (phase === 'loading') return <div className="app__loading">Loading…</div>;
  if (phase === 'error') return <div className="app__error">Error: {errorMsg}</div>;
  if (phase === 'auth') return <OtpDialog onSuccess={() => void handleAuthSuccess()} />;

  return (
    <>
      <Toolbar
        filename={filename}
        isDirty={isDirty}
        isSaving={isSaving}
        onSave={() => void handleSave()}
        onHistoryOpen={() => setHistoryOpen(true)}
      />
      <Editor
        language={language}
        value={editorContent}
        onChange={(value) => {
          setEditorContent(value);
          setIsDirty(value !== savedContentRef.current);
        }}
      />
      <HistoryDrawer
        versions={history}
        isOpen={historyOpen}
        currentHash={currentHash}
        onClose={() => setHistoryOpen(false)}
        onRestore={handleRestore}
      />
      {toast && (
        <Toast
          key={toast.key}
          message={toast.message}
          kind={toast.kind}
          onHide={() => setToast(null)}
        />
      )}
    </>
  );
}
