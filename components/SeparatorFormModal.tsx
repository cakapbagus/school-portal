'use client';
import { useState } from 'react';

interface SeparatorFormModalProps {
  separator?: { id: number; label: string; visible: boolean };
  folderId?: number;
  onClose: () => void;
  onSave: () => void;
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

export default function SeparatorFormModal({ separator, folderId, onClose, onSave, onToast }: SeparatorFormModalProps) {
  const isEdit = !!separator?.id;
  const [label, setLabel] = useState(separator?.label || '');
  const [visible, setVisible] = useState(separator?.visible !== false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const body = isEdit
        ? { id: separator!.id, type: 'separator', label, url: '', effect: 'none', visible }
        : { type: 'separator', label, url: '', effect: 'none', visible, ...(folderId ? { folder_id: folderId } : {}) };

      const res = await fetch('/api/links', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      onToast(isEdit ? 'Separator diperbarui' : 'Separator ditambahkan', 'success');
      onSave();
    } catch {
      onToast('Gagal menyimpan', 'error');
    } finally {
      setSaving(false);
    }
  }

  const fieldLabel: React.CSSProperties = {
    display: 'block', fontSize: '0.78rem', fontWeight: 600,
    color: 'var(--text2)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em',
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: '1.2rem' }}>
            {isEdit ? '✏️ Edit Separator' : '➖ Tambah Separator'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        </div>

        {/* Preview */}
        <div style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', background: 'var(--bg3)', borderRadius: 10, border: '1px solid var(--border)' }}>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', color: 'var(--text2)' }}>Preview:</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            { label ? (
              <>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                {label && <span style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text2)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{label}</span>}
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} /></>
              ) : <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            }
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={fieldLabel}>Label (opsional)</label>
            <input
              className="field"
              placeholder="Contoh: Menu Utama, Tautan Penting..."
              value={label}
              onChange={e => setLabel(e.target.value)}
            />
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.75rem', color: 'var(--text2)' }}>
              Kosongkan untuk garis pemisah tanpa teks
            </p>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={visible} onChange={e => setVisible(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: 'var(--accent)' }} />
            <span style={{ fontSize: '0.875rem' }}>
              <strong>Tampilkan</strong> <span style={{ color: 'var(--text2)' }}>(aktif & terlihat)</span>
            </span>
          </label>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Batal</button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave} disabled={saving}>
            {saving ? 'Menyimpan...' : (isEdit ? '💾 Simpan' : '✅ Tambah Separator')}
          </button>
        </div>
      </div>
    </div>
  );
}
