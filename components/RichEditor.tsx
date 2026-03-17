'use client';
import { useRef, useEffect, useState, useCallback } from 'react';

interface RichEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

const COLORS = [
  '#e8eaf6','#a78bfa','#38bdf8','#34d399','#fbbf24','#f87171','#f472b6','#fb923c',
  '#ffffff','#94a3b8','#6c63ff','#0ea5e9','#10b981','#ef4444','#f59e0b','#1e293b',
];

export default function RichEditor({ value, onChange, placeholder }: RichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [customColor, setCustomColor] = useState('#6c63ff');
  const colorPickerRef = useRef<HTMLDivElement>(null);
  // Save selection so it survives focus loss when clicking toolbar
  const savedRange = useRef<Range | null>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, []); // eslint-disable-line

  // Save selection whenever it changes inside editor
  function saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (editorRef.current?.contains(range.commonAncestorContainer)) {
        savedRange.current = range.cloneRange();
      }
    }
  }

  // Restore saved selection
  function restoreSelection() {
    if (!savedRange.current) return;
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    }
    editorRef.current?.focus();
  }

  function cmd(command: string, val?: string) {
    restoreSelection();
    document.execCommand(command, false, val);
    onChange(editorRef.current?.innerHTML || '');
    saveSelection();
  }

  function handleInput() {
    onChange(editorRef.current?.innerHTML || '');
  }

  function applyColor(color: string) {
    restoreSelection();
    document.execCommand('foreColor', false, color);
    onChange(editorRef.current?.innerHTML || '');
    saveSelection();
    setShowColorPicker(false);
  }

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
      setShowColorPicker(false);
    }
  }, []);

  useEffect(() => {
    if (showColorPicker) document.addEventListener('mousedown', handleClickOutside);
    else document.removeEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColorPicker, handleClickOutside]);

  const btnBase: React.CSSProperties = {
    height: 28, minWidth: 28,
    background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6,
    color: 'var(--text)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.78rem', fontWeight: 700, transition: 'all 0.15s',
    padding: '0 6px', flexShrink: 0,
  };
  const divider: React.CSSProperties = {
    width: 1, background: 'var(--border)', margin: '3px 2px', alignSelf: 'stretch',
  };

  return (
    <div>
      <div className="rich-toolbar" style={{ flexWrap: 'wrap', gap: '0.2rem' }}>
        {/* Format */}
        <button type="button" style={btnBase} onMouseDown={e => { e.preventDefault(); cmd('bold'); }} title="Bold"><strong>B</strong></button>
        <button type="button" style={btnBase} onMouseDown={e => { e.preventDefault(); cmd('italic'); }} title="Italic"><em style={{fontStyle:'italic'}}>I</em></button>
        <button type="button" style={btnBase} onMouseDown={e => { e.preventDefault(); cmd('underline'); }} title="Underline"><u>U</u></button>
        <div style={divider} />
        {/* Alignment */}
        <button type="button" style={btnBase} onMouseDown={e => { e.preventDefault(); cmd('justifyLeft'); }} title="Left">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="1" y="2" width="12" height="1.5" rx="0.75"/><rect x="1" y="5.5" width="8" height="1.5" rx="0.75"/><rect x="1" y="9" width="12" height="1.5" rx="0.75"/><rect x="1" y="12.5" width="6" height="1.5" rx="0.75"/></svg>
        </button>
        <button type="button" style={btnBase} onMouseDown={e => { e.preventDefault(); cmd('justifyCenter'); }} title="Center">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="1" y="2" width="12" height="1.5" rx="0.75"/><rect x="3" y="5.5" width="8" height="1.5" rx="0.75"/><rect x="1" y="9" width="12" height="1.5" rx="0.75"/><rect x="4" y="12.5" width="6" height="1.5" rx="0.75"/></svg>
        </button>
        <button type="button" style={btnBase} onMouseDown={e => { e.preventDefault(); cmd('justifyRight'); }} title="Right">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="1" y="2" width="12" height="1.5" rx="0.75"/><rect x="5" y="5.5" width="8" height="1.5" rx="0.75"/><rect x="1" y="9" width="12" height="1.5" rx="0.75"/><rect x="7" y="12.5" width="6" height="1.5" rx="0.75"/></svg>
        </button>
        <div style={divider} />
        {/* Color picker */}
        <div ref={colorPickerRef} style={{ position: 'relative' }}>
          <button
            type="button"
            style={{ ...btnBase, gap: 3, paddingRight: 4 }}
            onMouseDown={e => {
              e.preventDefault();
              saveSelection(); // save before picker opens
              setShowColorPicker(v => !v);
            }}
            title="Text Color"
          >
            <span style={{ fontSize: '0.85rem', color: 'var(--text)' }}>A</span>
            <span style={{ width: 10, height: 4, borderRadius: 2, background: customColor, display: 'block' }} />
          </button>

          {showColorPicker && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0,
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '0.6rem',
              boxShadow: '0 8px 28px rgba(0,0,0,0.35)',
              zIndex: 200, width: 196,
            }}>
              {/* Preset swatches */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 5, marginBottom: '0.6rem' }}>
                {COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onMouseDown={e => { e.preventDefault(); setCustomColor(color); applyColor(color); }}
                    style={{
                      width: '100%', aspectRatio: '1', borderRadius: 5,
                      background: color,
                      border: customColor === color ? '2px solid var(--accent)' : '1px solid rgba(128,128,128,0.25)',
                      cursor: 'pointer', padding: 0,
                      boxShadow: customColor === color ? '0 0 0 1px var(--bg), 0 0 0 3px var(--accent)' : 'none',
                      transition: 'transform 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.2)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                    title={color}
                  />
                ))}
              </div>
              {/* Divider */}
              <div style={{ height: 1, background: 'var(--border)', margin: '0 0 0.5rem' }} />
              {/* Custom color row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 5, background: customColor,
                  border: '1px solid var(--border)', flexShrink: 0,
                }} />
                <span style={{ fontSize: '0.72rem', color: 'var(--text2)', flex: 1 }}>Custom:</span>
                <input
                  type="color"
                  value={customColor}
                  onMouseDown={e => e.stopPropagation()} // prevent closing picker
                  onChange={e => {
                    setCustomColor(e.target.value);
                    restoreSelection();
                    document.execCommand('foreColor', false, e.target.value);
                    onChange(editorRef.current?.innerHTML || '');
                  }}
                  style={{
                    width: 36, height: 24, borderRadius: 5, border: '1px solid var(--border)',
                    cursor: 'pointer', padding: 1, background: 'var(--bg3)',
                  }}
                  title="Choose Custom Color"
                />
              </div>
            </div>
          )}
        </div>
        <div style={divider} />
        <button type="button" style={{ ...btnBase, color: 'var(--text2)', fontSize: '0.7rem' }} onMouseDown={e => { e.preventDefault(); cmd('removeFormat'); }} title="Remove Format">Tx</button>
      </div>

      <div
        ref={editorRef}
        className="rich-editor"
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        onKeyUp={saveSelection}
        onMouseUp={saveSelection}
        data-placeholder={placeholder || 'Nama yang ditampilkan...'}
        suppressContentEditableWarning
      />
      <style>{`
        .rich-editor:empty::before { content: attr(data-placeholder); color: var(--text2); pointer-events: none; }
      `}</style>
    </div>
  );
}
