import './Editor.css';
import { JSX, useEffect, useRef, useState } from 'react';
import 'prism-code-editor/prism/languages/markup';
import 'prism-code-editor/prism/languages/css';
import 'prism-code-editor/prism/languages/javascript';
import 'prism-code-editor/prism/languages/typescript';
import 'prism-code-editor/prism/languages/jsx';
import 'prism-code-editor/prism/languages/tsx';
import 'prism-code-editor/prism/languages/json';
import 'prism-code-editor/prism/languages/bash';
import 'prism-code-editor/prism/languages/yaml';
import 'prism-code-editor/prism/languages/markdown';
import 'prism-code-editor/prism/languages/python';
import 'prism-code-editor/prism/languages/rust';
import 'prism-code-editor/prism/languages/go';
import 'prism-code-editor/prism/languages/sql';
import { basicEditor } from 'prism-code-editor/setups';

export type EditorProps = {
  language: string;
  /** Current content. External changes (e.g. restore) are synced into the editor. */
  value: string;
  onChange: (value: string) => void;
};

export function Editor({ language, value, onChange }: EditorProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorInstanceRef = useRef<ReturnType<typeof basicEditor> | null>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  useEffect(() => {
    if (!containerRef.current) return;
    const editor = basicEditor(
      containerRef.current,
      {
        language,
        theme: 'github-dark',
        value,
        lineNumbers: true,
        onUpdate(v) {
          onChange(v);
        },
      },
      () => {
        setIsEditorReady(true);
      },
    );
    editorInstanceRef.current = editor;
    return () => {
      editor.remove();
      editorInstanceRef.current = null;
      setIsEditorReady(false);
    };
    // language/onChange/value are captured at mount; Editor is remounted when the file loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const editor = editorInstanceRef.current;
    if (!editor || editor.value === value) return;
    if (!isEditorReady) return;
    editor.setOptions({ value });
  }, [value, isEditorReady]);

  return <div ref={containerRef} className="editor" />;
}
