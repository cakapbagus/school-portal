'use client';
import { useState, useEffect } from 'react';

const FOLDER_ICONS = ['📁','📂','🗂️','📋','📌','⭐','🏫','📚','🔗','🌐','📢','🎯','💡','🔔','📝','🏆'];

export interface FolderData {
  id?: number;
  name: string;
  description?: string;
  icon: string;
  visible: boolean;
  link_ids?: number[];
  has_password?: number;
}

interface LinkOption {
  id: number;
  label: string;
  url: string;
  type: string;
}

interface FolderFormModalProps {
  folder?: FolderData;
  onClose: () => void;
  onSave: () => void;
  onToast: (msg: string, type?: 'success'|'error') => void;
}

type Tab = 'info' | 'links' | 'password';

export default function FolderFormModal({ folder, onClose, onSave, onToast }: FolderFormModalProps) {
  const isEdit = !!folder?.id;
  const [name, setName] = useState(folder?.name || '');
  const [description, setDescription] = useState(folder?.description || '');
  const [icon, setIcon] = useState(folder?.icon || '📁');
  const [visible, setVisible] = useState(folder?.visible !== false);
  const [selectedIds, setSelectedIds] = useState<number[]>(folder?.link_ids || []);
  const [password, setPassword] = useState('');
  const [clearPassword, setClearPassword] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allLinks, setAllLinks] = useState<LinkOption[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('info');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/links');
        const data = await res.json();
        setAllLinks((data.links || []).filter((l: LinkOption) => l.type === 'link'));
      } catch { /* ignore */ }
      finally { setLoadingLinks(false); }
    }
    load();
  }, []);

  function toggleLink(id: number) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  const filtered = allLinks.filter(l => {
    const plain = l.label.replace(/<[^>]+>/g, '').toLowerCase();
    return plain.includes(search.toLowerCase()) || l.url.toLowerCase().includes(search.toLowerCase());
  });

  async function handleSave() {
    if (!name.trim()) { onToast('Nama folder wajib diisi', 'error'); return; }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        ...(isEdit ? { id: folder!.id } : {}),
        name: name.trim(), description, icon, visible,
        link_ids: selectedIds,
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
      onToast(isEdit ? 'Folder diperbarui' : 'Folder ditambahkan', 'success');
      onSave();
    } catch { onToast('Gagal menyimpan', 'error'); }
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: '1.2rem' }}>
            {isEdit ? '✏️ Edit Folder' : '📁 Buat Folder'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg3)', borderRadius: 10, padding: '0.25rem', marginBottom: '1.25rem', border: '1px solid var(--border)' }}>
          <button style={tabStyle(activeTab === 'info')} onClick={() => setActiveTab('info')}>📋 Info</button>
          <button style={tabStyle(activeTab === 'links')} onClick={() => setActiveTab('links')}>
            🔗 Isi Link
            {selectedIds.length > 0 && (
              <span style={{ marginLeft: '0.35rem', background: 'var(--accent)', color: '#fff', borderRadius: 999, fontSize: '0.62rem', padding: '0.1rem 0.4rem', fontWeight: 700 }}>
                {selectedIds.length}
              </span>
            )}
          </button>
          <button style={tabStyle(activeTab === 'password')} onClick={() => setActiveTab('password')}>
            🔒 Password
            {(isEdit && folder?.has_password && !clearPassword) && (
              <span style={{ marginLeft: '0.35rem', width: 7, height: 7, borderRadius: '50%', background: 'var(--warning)', display: 'inline-block', verticalAlign: 'middle' }} />
            )}
          </button>
        </div>

        {/* ── Tab: Info ── */}
        {activeTab === 'info' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={fl}>Ikon Folder</label>
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
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{name || 'Nama Folder'}</div>
                {description && <div style={{ fontSize: '0.78rem', color: 'var(--text2)', marginTop: 2 }}>{description}</div>}
                <div style={{ fontSize: '0.72rem', color: 'var(--accent2)', marginTop: 2 }}>{selectedIds.length} link dipilih{(isEdit && folder?.has_password && !clearPassword) ? ' · 🔒 Berpassword' : ''}</div>
              </div>
            </div>
            <div>
              <label style={fl}>Nama Folder *</label>
              <input className="field" placeholder="Contoh: Menu Utama..." value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label style={fl}>Deskripsi (opsional)</label>
              <input className="field" placeholder="Keterangan singkat..." value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={visible} onChange={e => setVisible(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--accent)' }} />
              <span style={{ fontSize: '0.875rem' }}><strong>Tampilkan</strong> <span style={{ color: 'var(--text2)' }}>(folder terlihat di halaman)</span></span>
            </label>
          </div>
        )}

        {/* ── Tab: Links ── */}
        {activeTab === 'links' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input className="field" placeholder="🔍 Cari nama atau URL link..." value={search} onChange={e => setSearch(e.target.value)} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text2)' }}>{selectedIds.length} dari {allLinks.length} link dipilih</span>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedIds(filtered.map(l => l.id))}>Pilih Semua</button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedIds([])}>Hapus Semua</button>
              </div>
            </div>
            <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg3)' }}>
              {loadingLinks ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text2)', fontSize: '0.875rem' }}>Memuat link...</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text2)', fontSize: '0.875rem' }}>
                  {search ? 'Tidak ada link yang cocok' : 'Belum ada link di database'}
                </div>
              ) : filtered.map((link, i) => {
                const checked = selectedIds.includes(link.id);
                return (
                  <div key={link.id} onClick={() => toggleLink(link.id)} style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.65rem 0.875rem',
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                    cursor: 'pointer',
                    background: checked ? 'rgba(108,99,255,0.08)' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                    onMouseEnter={e => { if (!checked) (e.currentTarget as HTMLElement).style.background = 'var(--bg2)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = checked ? 'rgba(108,99,255,0.08)' : 'transparent'; }}
                  >
                    <div style={{
                      width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                      border: `2px solid ${checked ? 'var(--accent)' : 'var(--border)'}`,
                      background: checked ? 'var(--accent)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s',
                    }}>
                      {checked && <span style={{ color: '#fff', fontSize: '0.7rem', lineHeight: 1 }}>✓</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                        dangerouslySetInnerHTML={{ __html: link.label || '(tanpa nama)' }} />
                      <div style={{ fontSize: '0.72rem', color: 'var(--text2)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{link.url || '-'}</div>
                    </div>
                    {checked && <span style={{ fontSize: '0.65rem', background: 'rgba(108,99,255,0.2)', color: 'var(--accent2)', padding: '0.15rem 0.4rem', borderRadius: 999, flexShrink: 0 }}>✓</span>}
                  </div>
                );
              })}
            </div>
            {selectedIds.length > 0 && (
              <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(108,99,255,0.1)', border: '1px solid rgba(108,99,255,0.25)', borderRadius: 8, fontSize: '0.8rem', color: 'var(--accent2)' }}>
                💡 {selectedIds.length} link akan tampil di folder ini. Link tetap bisa berada di folder lain.
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Password ── */}
        {activeTab === 'password' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '0.75rem 1rem', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, fontSize: '0.825rem', color: 'var(--text2)', lineHeight: 1.5 }}>
              Jika diisi, pengunjung harus memasukkan password sebelum bisa melihat isi folder. Password tersimpan selama sesi tab aktif.
            </div>

            {isEdit && folder?.has_password && !clearPassword && (
              <div style={{ padding: '0.6rem 0.875rem', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 8, fontSize: '0.82rem', color: 'var(--warning)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>🔒 Password sudah diset</span>
                <button type="button" onClick={() => { setClearPassword(true); setPassword(''); }}
                  style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.8rem' }}>Hapus Password</button>
              </div>
            )}

            {isEdit && clearPassword && (
              <div style={{ padding: '0.6rem 0.875rem', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, fontSize: '0.82rem', color: 'var(--danger)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Password akan dihapus saat disimpan</span>
                <button type="button" onClick={() => setClearPassword(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: '0.8rem' }}>Batal</button>
              </div>
            )}

            <div>
              <label style={fl}>{isEdit ? 'Ganti Password' : 'Password Folder'}</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  className="field"
                  placeholder={isEdit ? 'Isi untuk ganti (kosongkan = tidak berubah)' : 'Kosongkan jika tanpa password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); if (clearPassword) setClearPassword(false); }}
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
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Batal</button>
          <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave} disabled={saving}>
            {saving ? 'Menyimpan...' : (isEdit ? '💾 Simpan Perubahan' : '✅ Buat Folder')}
          </button>
        </div>
      </div>
    </div>
  );
}
