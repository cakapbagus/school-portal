'use client';
import { useState, useRef, useEffect } from 'react';

interface PasswordModalProps {
  linkId: number;
  linkLabel: string;
  onClose: () => void;
  onSuccess: (url: string) => void;
}

export default function PasswordModal({ linkId, linkLabel, onClose, onSuccess }: PasswordModalProps) {
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
      const res = await fetch('/api/links/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: linkId, password: pw }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Wrong password');
      } else {
        onSuccess(data.url);
      }
    } catch {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(108,99,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem',
            fontSize: 24
          }}>🔒</div>
          <h3 style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: '1.25rem', color: 'var(--text)' }}>
            Locked Link
          </h3>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: 'var(--text2)' }}>
            Enter password to open
          </p>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--accent2)', fontStyle: 'italic' }}>
            &ldquo;{linkLabel}&rdquo;
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
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
              {loading ? '...' : 'Open'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
