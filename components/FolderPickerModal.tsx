'use client';
import { useState, useEffect } from 'react';

interface FolderOption {
  id: number | null;
  name: string;
  icon: string;
}

interface FolderPickerModalProps {
  linkLabel: string;
  currentFolderId?: number | null;
  onClose: () => void;
  onMove: (folderId: number | null) => void;
  onCopy: (folderId: number | null) => void;
}

export default function FolderPickerModal({
  linkLabel, currentFolderId, onClose, onMove, onCopy,
}: FolderPickerModalProps) {
  const [folders, setFolders] = useState<FolderOption[]>([]);
  const [selected, setSelected] = useState<number | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/folders')
      .then(r => r.json())
      .then(d => {
        const opts: FolderOption[] = [
          { id: null, name: 'Main Page (Root)', icon: '🏠' },
          ...(d.folders || []).map((f: { id: number; name: string; icon: string }) => ({
            id: f.id, name: f.name, icon: f.icon,
          })),
        ];
        setFolders(opts);
      })
      .finally(() => setLoading(false));
  }, []);

  const canAct = selected !== undefined && selected !== currentFolderId;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: '1.1rem' }}>↪ Move / Copy</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}>✕</button>
        </div>

        {/* Link label */}
        <p style={{ margin: '0 0 0.875rem', fontSize: '0.8rem', color: 'var(--text2)' }}>
          Link:{' '}
          <span style={{ color: 'var(--text)', fontWeight: 600 }}
            dangerouslySetInnerHTML={{ __html: linkLabel }} />
        </p>

        {/* Folder list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: 280, overflowY: 'auto', marginBottom: '1rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text2)', fontSize: '0.875rem' }}>Loading...</div>
          ) : folders.map(f => {
            const isCurrent = f.id === (currentFolderId ?? null);
            const isSelected = selected === f.id;
            return (
              <button
                key={f.id ?? 'root'}
                type="button"
                onClick={() => !isCurrent && setSelected(f.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.65rem',
                  padding: '0.6rem 0.75rem', borderRadius: 10,
                  border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                  background: isSelected ? 'rgba(108,99,255,0.1)' : isCurrent ? 'var(--bg3)' : 'var(--bg3)',
                  cursor: isCurrent ? 'not-allowed' : 'pointer',
                  opacity: isCurrent ? 0.5 : 1,
                  textAlign: 'left', fontFamily: 'Plus Jakarta Sans, sans-serif',
                  transition: 'all 0.15s',
                }}
              >
                {/* Radio dot */}
                <span style={{
                  width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                  border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                  background: isSelected ? 'var(--accent)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}>
                  {isSelected && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'block' }} />}
                </span>
                <span style={{ fontSize: '1.1rem' }}>{f.icon}</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)' }}>{f.name}</span>
                {isCurrent && <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text2)' }}>current</span>}
              </button>
            );
          })}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-secondary"
            style={{ flex: 1, opacity: canAct ? 1 : 0.4, pointerEvents: canAct ? 'all' : 'none' }}
            onClick={() => canAct && onCopy(selected!)}
            disabled={!canAct}
            title="Create copy in destination folder"
          >
            📋 Copy
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 1, opacity: canAct ? 1 : 0.4, pointerEvents: canAct ? 'all' : 'none' }}
            onClick={() => canAct && onMove(selected!)}
            disabled={!canAct}
            title="Move link to destination folder"
          >
            ➡️ Move
          </button>
        </div>
      </div>
    </div>
  );
}
