'use client';
import { useState, useRef } from 'react';

interface SiteSettings {
  site_title: string;
  site_subtitle: string;
  site_logo: string;
  site_banner: string;
}

interface SettingsModalProps {
  settings: SiteSettings;
  onClose: () => void;
  onSave: (settings: SiteSettings) => void;
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

type Tab = 'portal' | 'password';

export default function SettingsModal({ settings, onClose, onSave, onToast }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('portal');

  // Portal settings
  const [title, setTitle] = useState(settings.site_title || '');
  const [subtitle, setSubtitle] = useState(settings.site_subtitle || '');
  const [logo, setLogo] = useState(settings.site_logo || '');
  const [originalLogo, setOriginalLogo] = useState(settings.site_logo || '');
  const [banner, setBanner] = useState(settings.site_banner || '');
  const [originalBanner, setOriginalBanner] = useState(settings.site_banner || '');
  const bannerFileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [savingPortal, setSavingPortal] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Password change
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [savingPw, setSavingPw] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleUploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.url) setLogo(data.url);
      else onToast('Upload gagal', 'error');
    } catch { onToast('Upload gagal', 'error'); }
    finally { setUploading(false); }
  }

  async function handleUploadBanner(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.url) setBanner(data.url);
      else onToast('Upload gagal', 'error');
    } catch { onToast('Upload gagal', 'error'); }
    finally { setUploading(false); }
  }

  async function deleteFile(url: string) {
    if (!url || !url.startsWith('/uploads/')) return;
    try {
      await fetch('/api/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
    } catch { /* ignore */ }
  }

  async function handleSavePortal() {
    setSavingPortal(true);
    try {
      if (originalLogo !== logo && originalLogo.startsWith('/uploads/')) await deleteFile(originalLogo);
      if (originalBanner !== banner && originalBanner.startsWith('/uploads/')) await deleteFile(originalBanner);
      setOriginalLogo(logo);
      setOriginalBanner(banner);
      const res = await fetch('/api/links', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { site_title: title, site_subtitle: subtitle, site_logo: logo, site_banner: banner } }),
      });
      if (!res.ok) throw new Error();
      onSave({ site_title: title, site_subtitle: subtitle, site_logo: logo, site_banner: banner });
      onToast('Pengaturan disimpan', 'success');
      onClose();
    } catch { onToast('Gagal menyimpan', 'error'); }
    finally { setSavingPortal(false); }
  }

  async function handleChangePassword() {
    setPwError('');
    if (!currentPw || !newPw || !confirmPw) {
      setPwError('Semua kolom wajib diisi'); return;
    }
    if (newPw.length < 6) {
      setPwError('Password baru minimal 6 karakter'); return;
    }
    if (newPw !== confirmPw) {
      setPwError('Konfirmasi password tidak cocok'); return;
    }
    setSavingPw(true);
    try {
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPw, new_password: newPw }),
      });
      const data = await res.json();
      if (!res.ok) { setPwError(data.error || 'Gagal mengubah password'); return; }
      onToast('Password berhasil diubah', 'success');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      onClose();
    } catch { setPwError('Terjadi kesalahan'); }
    finally { setSavingPw(false); }
  }

  const fl: React.CSSProperties = {
    display: 'block', fontSize: '0.78rem', fontWeight: 600,
    color: 'var(--text2)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em',
  };

  const pwStrength = (pw: string) => {
    if (!pw) return null;
    if (pw.length < 6) return { label: 'Terlalu pendek', color: 'var(--danger)', width: '20%' };
    if (pw.length < 8) return { label: 'Lemah', color: 'var(--warning)', width: '40%' };
    const has = (r: RegExp) => r.test(pw);
    const score = [has(/[A-Z]/), has(/[0-9]/), has(/[^A-Za-z0-9]/)].filter(Boolean).length;
    if (score === 0) return { label: 'Sedang', color: 'var(--warning)', width: '55%' };
    if (score === 1) return { label: 'Kuat', color: 'var(--success)', width: '75%' };
    return { label: 'Sangat Kuat', color: 'var(--success)', width: '100%' };
  };

  const strength = pwStrength(newPw);

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: '1.2rem' }}>⚙️ Pengaturan</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg3)', borderRadius: 10, padding: '0.25rem', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
          {([['portal', '🏫 Portal'], ['password', '🔑 Password']] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                flex: 1, border: 'none', borderRadius: 8, padding: '0.45rem',
                fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                background: activeTab === key ? 'var(--card)' : 'transparent',
                color: activeTab === key ? 'var(--text)' : 'var(--text2)',
                boxShadow: activeTab === key ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
                transition: 'all 0.2s',
              }}
            >{label}</button>
          ))}
        </div>

        {/* ── Tab: Portal ── */}
        {activeTab === 'portal' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={fl}>Judul Portal</label>
                <input className="field" value={title} onChange={e => setTitle(e.target.value)} placeholder="Portal Sekolah" />
              </div>
              <div>
                <label style={fl}>Subjudul / Tagline</label>
                <input className="field" value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="Link & Informasi Sekolah" />
              </div>
              <div>
                <label style={fl}>Logo Sekolah</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input className="field" type="text" placeholder="URL logo..." value={logo} onChange={e => setLogo(e.target.value)} style={{ flex: 1 }} />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    {uploading ? '...' : '📁'}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUploadLogo} />
                </div>
                {logo && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logo} alt="" style={{ width: 60, height: 60, borderRadius: 10, objectFit: 'contain', border: '1px solid var(--border)', background: 'var(--bg3)', padding: 4 }} />
                    <button
                      type="button"
                      onClick={() => { deleteFile(logo); setLogo(''); }}
                      style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--danger)', fontFamily: 'Plus Jakarta Sans, sans-serif', padding: '0.25rem 0.5rem', borderRadius: 6 }}
                    >
                      🗑️ Hapus Logo
                    </button>
                  </div>
                )}
              </div>
              {/* Banner */}
              <div>
                <label style={fl}>Banner / Header Image</label>
                <p style={{ margin: '0 0 0.4rem', fontSize: '0.75rem', color: 'var(--text2)' }}>
                  Gambar lebar yang tampil di atas portal (rekomendasi: 1200×400px)
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input className="field" type="text" placeholder="URL banner atau upload..." value={banner} onChange={e => setBanner(e.target.value)} style={{ flex: 1 }} />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => bannerFileRef.current?.click()} disabled={uploading}>
                    {uploading ? '...' : '📁'}
                  </button>
                  <input ref={bannerFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUploadBanner} />
                </div>
                {banner && (
                  <div style={{ marginTop: '0.5rem' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={banner} alt="" style={{ width: '100%', maxHeight: 100, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)' }} />
                    <button type="button" onClick={() => { deleteFile(banner); setBanner(''); }}
                      style={{ marginTop: '0.35rem', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--danger)', fontFamily: 'Plus Jakarta Sans, sans-serif', padding: '0.25rem 0.5rem', borderRadius: 6 }}>
                      🗑️ Hapus Banner
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Batal</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSavePortal} disabled={savingPortal}>
                {savingPortal ? 'Menyimpan...' : '💾 Simpan'}
              </button>
            </div>
          </>
        )}

        {/* ── Tab: Password ── */}
        {activeTab === 'password' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {/* Current password */}
              <div>
                <label style={fl}>Password Saat Ini</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="field"
                    type={showCurrent ? 'text' : 'password'}
                    placeholder="Masukkan password saat ini..."
                    value={currentPw}
                    onChange={e => { setCurrentPw(e.target.value); setPwError(''); }}
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(v => !v)}
                    style={{ position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', fontSize: '1rem', padding: 0, lineHeight: 1 }}
                  >{showCurrent ? '🙈' : '👁️'}</button>
                </div>
              </div>

              <div style={{ height: 1, background: 'var(--border)' }} />

              {/* New password */}
              <div>
                <label style={fl}>Password Baru</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="field"
                    type={showNew ? 'text' : 'password'}
                    placeholder="Minimal 6 karakter..."
                    value={newPw}
                    onChange={e => { setNewPw(e.target.value); setPwError(''); }}
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(v => !v)}
                    style={{ position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', fontSize: '1rem', padding: 0, lineHeight: 1 }}
                  >{showNew ? '🙈' : '👁️'}</button>
                </div>
                {/* Strength meter */}
                {strength && (
                  <div style={{ marginTop: '0.4rem' }}>
                    <div style={{ height: 3, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: strength.width, background: strength.color, borderRadius: 999, transition: 'all 0.3s' }} />
                    </div>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.72rem', color: strength.color }}>{strength.label}</p>
                  </div>
                )}
              </div>

              {/* Confirm new password */}
              <div>
                <label style={fl}>Konfirmasi Password Baru</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="field"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Ulangi password baru..."
                    value={confirmPw}
                    onChange={e => { setConfirmPw(e.target.value); setPwError(''); }}
                    style={{
                      paddingRight: '2.5rem',
                      borderColor: confirmPw && newPw && confirmPw !== newPw ? 'var(--danger)' : undefined,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    style={{ position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', fontSize: '1rem', padding: 0, lineHeight: 1 }}
                  >{showConfirm ? '🙈' : '👁️'}</button>
                </div>
                {confirmPw && newPw && confirmPw !== newPw && (
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.72rem', color: 'var(--danger)' }}>Password tidak cocok</p>
                )}
                {confirmPw && newPw && confirmPw === newPw && (
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.72rem', color: 'var(--success)' }}>✓ Password cocok</p>
                )}
              </div>

              {/* Error message */}
              {pwError && (
                <div style={{ padding: '0.6rem 0.875rem', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8, fontSize: '0.825rem', color: 'var(--danger)' }}>
                  ⚠️ {pwError}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Batal</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleChangePassword} disabled={savingPw}>
                {savingPw ? 'Menyimpan...' : '🔑 Ubah Password'}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
