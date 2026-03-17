'use client';
import { useState, useEffect } from 'react';

const FOLDER_ICONS = ['📁','📂','🗂️','📋','📌','⭐','🏫','📚','🔗','🌐','📢','🎯','💡','🔔','📝','🏆'];

export interface FolderData {
  id?: number;
  name: string;
  description?: string;
  icon: string;
  visible: boolean;
  has_password?: number;
}

interface FolderFormModalProps {
  folder?: FolderData;
  onClose: () => void;
  onSave: () => void;
  onToast: (msg: string, type?: 'success'|'error') => void;
}

type Tab = 'info' | 'password';

export default function FolderFormModal({ folder, onClose, onSave, onToast }: FolderFormModalProps) {
  const isEdit = !!folder?.id;
  const [name, setName] = useState(folder?.name || '');
  const [description, setDescription] = useState(folder?.description || '');
  const [icon, setIcon] = useState(folder?.icon || '📁');
  const [visible, setVisible] = useState(folder?.visible !== false);
  const [password, setPassword] = useState('');
  const [clearPassword, setClearPassword] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('info');

  async function handleSave() {
    if (!name.trim()) { onToast('Folder name is required', 'error'); return; }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        ...(isEdit ? { id: folder!.id } : {}),
        name: name.trim(), description, icon, visible,
      };
      if (clearPassword) {
        body.clear_password = true;
      } else if (password.trim()) {
        body.password = password.trim();
      }
      const res = await fetch('/api/folders', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      onToast(isEdit ? 'Folder updated' : 'Folder added', 'success');
      onSave();
    } catch { onToast('Failed to save folder', 'error'); }
    finally { setSaving(false); }
  }

  const fl: React.CSSProperties = {
    display: 'block', fontSize: '0.78rem', fontWeight: 600,
    color: 'var(--text2)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em',
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, border: 'none', borderRadius: 8, padding: '0.45rem',
    fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
    fontFamily: 'Plus Jakarta Sans, sans-serif',
    background: active ? 'var(--card)' : 'transparent',
    color: active ? 'var(--text)' : 'var(--text2)',
    boxShadow: active ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  });

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: '1.2rem' }}>
            {isEdit ? '✏️ Edit Folder' : '📁 Create Folder'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg3)', borderRadius: 10, padding: '0.25rem', marginBottom: '1.25rem', border: '1px solid var(--border)' }}>
          <button style={tabStyle(activeTab === 'info')} onClick={() => setActiveTab('info')}>📋 Info</button>
          <button style={tabStyle(activeTab === 'password')} onClick={() => setActiveTab('password')}>
            🔒 Password
            {(isEdit && folder?.has_password === 1 && !clearPassword) && (
              <span style={{ marginLeft: '0.35rem', width: 7, height: 7, borderRadius: '50%', background: 'var(--warning)', display: 'inline-block', verticalAlign: 'middle' }} />
            )}
          </button>
        </div>

        {/* ── Tab: Info ── */}
        {activeTab === 'info' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={fl}>Folder Icon</label>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', background: 'var(--bg3)', borderRadius: 10, padding: '0.6rem', border: '1px solid var(--border)' }}>
                {FOLDER_ICONS.map(ic => (
                  <button key={ic} type="button" onClick={() => setIcon(ic)} style={{
                    width: 36, height: 36, borderRadius: 8, fontSize: '1.2rem',
                    background: icon === ic ? 'rgba(108,99,255,0.2)' : 'var(--bg)',
                    border: `1px solid ${icon === ic ? 'var(--accent)' : 'var(--border)'}`,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}>{ic}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'var(--bg3)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '2rem' }}>{icon}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{name || 'Folder Name'}</div>
                {description && <div style={{ fontSize: '0.78rem', color: 'var(--text2)', marginTop: 2 }}>{description}</div>}
                <div style={{ fontSize: '0.72rem', color: 'var(--accent2)', marginTop: 2 }}>{(isEdit && folder?.has_password === 1 && !clearPassword) ? '🔒 Password Protected' : ''}</div>
              </div>
            </div>
            <div>
              <label style={fl}>Folder Name *</label>
              <input className="field" placeholder="Example: Main Menu..." value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label style={fl}>Description (optional)</label>
              <input className="field" placeholder="Brief description..." value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={visible} onChange={e => setVisible(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--accent)' }} />
              <span style={{ fontSize: '0.875rem' }}><strong>Tampilkan</strong> <span style={{ color: 'var(--text2)' }}>(folder terlihat di halaman)</span></span>
            </label>
          </div>
        )}

        {/* ── Tab: Password ── */}
        {activeTab === 'password' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '0.75rem 1rem', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, fontSize: '0.825rem', color: 'var(--text2)', lineHeight: 1.5 }}>
              If set, visitors must enter a password before they can view the folder's contents. The password is stored for the duration of the active tab session.
            </div>

            {isEdit && folder?.has_password === 1 && !clearPassword && (
              <div style={{ padding: '0.6rem 0.875rem', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 8, fontSize: '0.82rem', color: 'var(--warning)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>🔒 Password already set</span>
                <button type="button" onClick={() => { setClearPassword(true); setPassword(''); }}
                  style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.8rem' }}>Delete Password</button>
              </div>
            )}

            {isEdit && clearPassword && (
              <div style={{ padding: '0.6rem 0.875rem', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, fontSize: '0.82rem', color: 'var(--danger)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Password will be deleted when saved</span>
                <button type="button" onClick={() => setClearPassword(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
              </div>
            )}

            <div>
              <label style={fl}>{isEdit ? 'Change Password' : 'Folder Password'}</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  className="field"
                  placeholder={isEdit ? 'Fill to change (leave blank = no change)' : 'Leave blank if no password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={clearPassword}
                  style={{ paddingRight: '2.5rem' }}
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  style={{ position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', fontSize: '1rem', padding: 0, lineHeight: 1 }}>
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : (isEdit ? '💾 Save Changes' : '✅ Create Folder')}
          </button>
        </div>
      </div>
    </div>
  );
}
