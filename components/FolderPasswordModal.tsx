'use client';
import { useState, useRef, useEffect } from 'react';

interface FolderPasswordModalProps {
  folderId: number;
  folderName: string;
  folderIcon: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function FolderPasswordModal({
  folderId, folderName, folderIcon, onClose, onSuccess,
}: FolderPasswordModalProps) {
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pw.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/folders/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: folderId, password: pw }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Password salah');
      } else {
        // Simpan unlock status di sessionStorage
        sessionStorage.setItem(`folder_unlocked_${folderId}`, '1');
        onSuccess();
      }
    } catch {
      setError('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: 'rgba(108,99,255,0.12)',
            border: '1px solid rgba(108,99,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem', fontSize: '2rem',
            position: 'relative',
          }}>
            {folderIcon}
            <span style={{
              position: 'absolute', bottom: -6, right: -6,
              width: 22, height: 22, borderRadius: '50%',
              background: 'var(--warning)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.7rem', border: '2px solid var(--card)',
            }}>🔒</span>
          </div>
          <h3 style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: '1.2rem' }}>
            Folder Terkunci
          </h3>
          <p style={{ margin: '0.4rem 0 0', fontSize: '0.875rem', color: 'var(--text2)' }}>
            Masukkan password untuk membuka folder
          </p>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--accent2)', fontStyle: 'italic' }}>
            &ldquo;{folderName}&rdquo;
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            ref={inputRef}
            type="password"
            className="field"
            placeholder="Password..."
            value={pw}
            onChange={e => { setPw(e.target.value); setError(''); }}
            style={{ textAlign: 'center', fontSize: '1rem', letterSpacing: '0.1em' }}
          />
          {error && (
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--danger)', textAlign: 'center' }}>
              {error}
            </p>
          )}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
              {loading ? '...' : 'Buka'}
            </button>
          </div>
        </form>

        <p style={{ margin: '0.75rem 0 0', fontSize: '0.72rem', color: 'var(--text2)', textAlign: 'center' }}>
          Sesi akan berakhir saat tab ditutup
        </p>
      </div>
    </div>
  );
}
